import mongoose from "mongoose"
const MAX_RETRIES = 5
const RETRY_INTERVAL = 5000

class Connection {
  constructor() {
    this.retryCount = 0
    this.isConnected = false

    mongoose.set("strictQuery", true)
    mongoose.connection.on("connected", () => {
      console.log("connected")
      this.isConnected = true
    })

    mongoose.connection.on("disconnected", () =>{
      console.log("disconnected")
      this.isConnected = false
      this.handleDisconnect()
    })

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      this.isConnected = false;
  });

    process.on("SIGTERM", this.handleAppTermination.bind(this))
  }

  async connect() {
    if (this.isConnected) {
      console.log("Already connected")
      return
    }

    
    try {
      if (!process.env.MONGO_URL) {
        throw new Error("MONGO_URL is not set")
      }
      if (process.env.NODE_ENV === "development") {
        mongoose.set("debug", true)
      }
      this.connection = await mongoose.connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        autoReconnect: true,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
      })
      this.retryCount = 0
      console.log("Database connected")
    } catch (error) {
      console.error("Error connecting to database:", error)
      await this.handleErrors()
    }
  }

  async handleErrors() {
    if (this.retries < MAX_RETRIES) {
      this.retries++
      console.log(`Retrying ${this.retries} th time...`)
      setTimeout(async () => await this.connect(), RETRY_INTERVAL)
    }
  }

  async handleDisconnect() {
    if(!this.isConnected) {
      console.log("Database is connected")
      await this.connect()
    }
  }

  async disconnect() {
    await mongoose.disconnect()
    console.log("Database disconnected")
  }

  async handleAppTermination() {
    try {
      await mongoose.connection.close()
      console.log("Database connection closed")
      process.exit(0)
    } catch (error) {
      console.error("Error disconnecting from database:", error)
      process.exit(1)
    }
  }


  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,

    }
  }
}

const dbConnection = new Connection()


export default dbConnection.connect.bind(dbConnection)
export const getConnectionStatus = dbConnection.getConnectionStatus.bind(dbConnection)