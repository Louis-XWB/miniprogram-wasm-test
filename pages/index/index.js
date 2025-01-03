// index.js
const { loadWasmModule } = require('../../utils/wasmModule')
const { database } = require('../worker/database')

Page({
  data: {
    wasmOutput: null,
    isDatabaseReady: false,
    wasmModule: null
  },

  async initDatabase() {
    try {
      // 1. 加载WASM模块
      // console.log(database)
      // this.wasmModule = database.Module
      // console.log(this.wasmModule)
      
      // 2. 初始化数据库
      const dbSysconfEnvInit = this.wasmModule.cwrap('db_sysconf_env_init', 'number', ['number', 'number'])
      const result = dbSysconfEnvInit(0, 1)
      
      if (result !== 0) {
        throw new Error(`Database initialization failed: ${result}`)
      }

      this.setData({
        isDatabaseReady: true,
        wasmOutput: 'Database initialized successfully!'
      })

    } catch (error) {
      console.error('Init error:', error)
      this.setData({
        wasmOutput: `Error: ${error.message}`,
        isDatabaseReady: false
      })
    }
  },

  async setLoopSensor() {
    try {
      const { cwrap } = this.wasmModule
      
      // 调用WASM函数设置传感器
      const dbSetLoopSensor = cwrap('db_set_loop_sensor', 'number', ['number', 'number'])
      const result = dbSetLoopSensor(0, 1) // 简化参数

      if (result !== 0) {
        throw new Error(`Failed to set sensor: ${result}`)
      }

      this.setData({
        wasmOutput: 'Set sensor success'
      })

    } catch (error) {
      console.error('Error:', error)
      this.setData({
        wasmOutput: `Error: ${error.message}`
      })
    }
  },

  async getLoopSensor() {
    try {
      const { cwrap } = this.wasmModule
      
      // 调用WASM函数获取传感器
      const dbGetLoopSensor = cwrap('db_get_loop_sensor', 'number', ['number', 'number'])
      const result = dbGetLoopSensor(0, 1) // 简化参数

      if (result !== 0) {
        throw new Error(`Failed to get sensor: ${result}`)
      }

      // 这里需要根据实际返回数据结构解析结果
      const sensorData = {
        addr_id: 1,
        reg_enable: 1,
        place_desc: 'Test Sensor'
      }

      this.setData({
        wasmOutput: `Get sensor success:\n${JSON.stringify(sensorData, null, 2)}`
      })

    } catch (error) {
      console.error('Error:', error)
      this.setData({
        wasmOutput: `Error: ${error.message}`
      })
    }
  },

  async testSqliteQuery() {
    try {
      const { cwrap } = this.wasmModule
      
      // 执行简单的查询
      const sqlite3_exec = cwrap('sqlite3_exec', 'number', ['number', 'string', 'number', 'number', 'number'])
      const result = sqlite3_exec(0, 'SELECT * FROM loop_sensor LIMIT 1', 0, 0, 0)

      if (result !== 0) {
        throw new Error(`Query failed: ${result}`)
      }

      this.setData({
        wasmOutput: 'Query executed successfully'
      })

    } catch (error) {
      console.error('Query error:', error)
      this.setData({
        wasmOutput: `Error: ${error.message}`
      })
    }
  }
})
