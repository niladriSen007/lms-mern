import dotenv from "dotenv"
import express from "express"
import morgan from "morgan"
import helmet from "helmet"
import mongoSanitize from "express-mongo-sanitize"
import hpp from "hpp"
import xXss from "x-xss-protection"
import cookieParser from "cookie-parser"
import cors from "cors"
import { rateLimit } from "express-rate-limit"
dotenv.config({
  path: "../.env",
})

const app = express()

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  message: "Too many requests, please try again later.",
})

//Security Middlewares
app.use(helmet())
app.use("/api", limiter)
app.use(
  mongoSanitize({
    allowDots: true,
  })
)
app.use(hpp())
app.use(xXss())

//Logger
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"))
}

//Middlewares
app.use(
  express.json({
    limit: "10kb",
    type: "application/json",
  })
)
app.use(express.urlencoded({ extended: true, limit: "10kb" }))
app.use(cookieParser())
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type",
    "Authorization",
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Methods",
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-HTTP-Method-Override",
    "device-remember-token",
  ],
}))

//Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    status: "error",
    message: "Something went wrong",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  })
})

//Api routes
app.get("/", (req, res) => {
  res.send("Hello World!")
})
app.get("/*name", (req, res) => {
  res.status(404).send("Not Found")
})

//Start server
app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`)
})
