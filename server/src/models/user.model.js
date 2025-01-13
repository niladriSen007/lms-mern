import mongoose, { model, Schema } from "mongoose"
import bcrypt from "bcryptjs"
import crypto from "crypto"

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      maxLength: [30, "Name cannot exceed 30 characters"],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      required: [true, "Please provide an email"],
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minLength: [1, "Password must be at least 1 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ["student", "instructor", "admin"],
        message: "Please select a valid role",
      },
      default: "student",
    },
    avatar: {
      type: String,
      default: "https://www.gravatar.com/avatar/000?d=mp",
    },
    bio: {
      type: String,
      maxLength: [500, "Bio cannot exceed 500 characters"],
    },
    enrolledCourses: [
      {
        course: {
          type: Schema.Types.ObjectId,
          ref: "Course",
          required: true,
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdCourses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpire: {
      type: Date,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next()
  }
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

userSchema.methods.matchPasswords = async function (userPassword) {
  return await bcrypt.compare(userPassword, this.password)
}

userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex")
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex")
  this.resetPasswordExpire = Date.now() + 10 * (60 * 1000)
  return resetToken
}

userSchema.virtual("totalEnrolledCourses").get(function () {
  return this.enrolledCourses.length
})

userSchema.methods.updateLastActive = async function () {
  this.lastActive = Date.now()
  await this.save({ validateBeforeSave: false })
}

export const User = model("User", userSchema)
