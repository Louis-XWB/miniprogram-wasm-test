async function loadWasmModule() {
  try {
    const fs = wx.getFileSystemManager()
    const miniProgramPath = wx.env.USER_DATA_PATH
    
    // 使用新的 API 获取系统信息
    const { platform } = wx.getAppBaseInfo()
    console.log('Environment:', {
      miniProgramPath,
      platform
    })

    // 创建临时目录
    const tempDir = `${miniProgramPath}/temp`
    try {
      fs.mkdirSync(tempDir, true)
    } catch (e) {
      console.log('Temp directory exists')
    }

    const wasmPath = `${tempDir}/database.wasm`
    const jsPath = `${tempDir}/database.js`

    // 从云存储下载文件
    try {
      const wasmResult = await wx.cloud.downloadFile({
        fileID: 'cloud://your-env-id.wasm/database.wasm',
      })
      
      const jsResult = await wx.cloud.downloadFile({
        fileID: 'cloud://your-env-id.wasm/database.js',
      })

      // 保存到本地临时文件
      fs.writeFileSync(wasmPath, wasmResult.tempFilePath)
      fs.writeFileSync(jsPath, jsResult.tempFilePath, 'utf-8')
      
      console.log('Files downloaded from cloud storage')

    } catch (error) {
      console.error('Cloud download failed:', error)
      
      // 尝试从本地包内读取
      try {
        const wasmContent = fs.readFileSync(`${__dirname}/wasm/database.wasm`)
        const jsContent = fs.readFileSync(`${__dirname}/wasm/database.js`, 'utf-8')
        
        fs.writeFileSync(wasmPath, wasmContent)
        fs.writeFileSync(jsPath, jsContent, 'utf-8')
        
        console.log('Files copied from local package')
      } catch (e) {
        console.error('Local file access failed:', e)
        throw new Error('Cannot access WASM files')
      }
    }

    // 读取已保存的 WASM 文件
    const wasmBinary = fs.readFileSync(wasmPath)
    console.log('WASM file loaded, size:', wasmBinary.byteLength)

    // 创建 WASM 实例
    const wasmModule = await WebAssembly.instantiate(wasmBinary, {
      env: {
        memory: new WebAssembly.Memory({ initial: 256 }),
        table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' }),
        __memory_base: 0,
        __table_base: 0,
        _abort: () => { },
        _emscripten_memcpy_big: () => { },
        _emscripten_resize_heap: () => { },
        abortOnCannotGrowMemory: () => { },
        setTempRet0: () => { }
      },
      wasi_snapshot_preview1: {
        fd_write: () => { },
        fd_seek: () => { },
        fd_close: () => { },
        proc_exit: () => { }
      }
    })

    return {
      ...wasmModule.instance.exports,
      cwrap: (name, returnType, paramTypes) => {
        const fn = wasmModule.instance.exports[name]
        if (!fn) throw new Error(`Function ${name} not found`)
        return fn
      },
      _malloc: wasmModule.instance.exports.malloc,
      _free: wasmModule.instance.exports.free,
      setValue: (ptr, value) => {
        const memory = wasmModule.instance.exports.memory
        new Int32Array(memory.buffer)[ptr >> 2] = value
      },
      getValue: (ptr, type) => {
        const memory = wasmModule.instance.exports.memory
        return new Int32Array(memory.buffer)[ptr >> 2]
      },
      stringToUTF8: (str, outPtr, maxBytesToWrite) => {
        const memory = wasmModule.instance.exports.memory
        const buf = new Uint8Array(memory.buffer, outPtr, maxBytesToWrite)
        const strBytes = new TextEncoder().encode(str)
        buf.set(strBytes.slice(0, maxBytesToWrite - 1))
        buf[strBytes.length] = 0
      }
    }

  } catch (error) {
    console.error('Failed to load WASM module:', error)
    throw error
  }
}

module.exports = {
  loadWasmModule
} 