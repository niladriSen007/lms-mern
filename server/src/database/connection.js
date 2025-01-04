import mongoose, { mongo } from "mongoose"
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
    mongoose.connection.on("open", () => console.log("open"))
    mongoose.connection.on("disconnected", () =>{
      console.log("disconnected")
      this.isConnected = false
      this.handleDisconnect()
    })
    mongoose.connection.on("reconnected", () => console.log("reconnected"))
    mongoose.connection.on("disconnecting", () => console.log("disconnecting"))
    mongoose.connection.on("close", () => console.log("close"))

    process.on("SIGTERM", this.handleAppTermination.bind(this))
  }

  async connect() {
    if (this.isConnected) {
      console.log("Already connected")
      return
    }

    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL is not set")
    }

    try {
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
    /* mongoose.connection.on("error", (error) => { */
      console.error("Error connecting to database:", error)
      if (this.retries < MAX_RETRIES) {
        this.retries++
        console.log(`Retrying ${this.retries} th time in ${RETRY_INTERVAL / 1000} seconds...`)
        setTimeout(async () => await this.connect(), RETRY_INTERVAL)
      } else {
        console.error("Max retries reached. Exiting...")
        process.exit(1)
      }
    /* }) */
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
      process.exit(1)
    } catch (error) {
      console.error("Error disconnecting from database:", error)
      process.exit(0)
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