const User = require("../models/user");
const { moveFile, cleanupFile } = require("../middlewares/Fileuploader");
const generator = require("generate-password");
const jwt = require("jsonwebtoken");
const sendUserCreatedMail = require("./mailer");

// Login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        picture: user.picture,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      success: true,
      data: { user: userResponse, token },
      message: "Login successful",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create a new user
const createUser = async (req, res) => {
  let tempFilePath = req.file?.path;
  let password = req.body.password || generator.generate({
    length: 8,
    uppercase: true,
    numbers: true,
    symbols: true,
  });

  try {
    const userData = {
      name: req.body.name,
      age: req.body.age,
      email: req.body.email,
      password,
      role: req.body.role || "user",
      active: req.body.active !== undefined ? req.body.active : true,
      address: req.body.address,
    };

    const user = new User(userData);
    const savedUser = await user.save();

    await sendUserCreatedMail({
      email: userData.email,
      name: userData.name,
      role: userData.role,
      password,
    });

    if (tempFilePath) {
      const finalPath = await moveFile(tempFilePath);
      savedUser.picture = finalPath || "avatar.png";
      await savedUser.save();
      tempFilePath = null;
    }

    const userResponse = savedUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      data: userResponse,
      message: "User created successfully",
    });
  } catch (error) {
    if (tempFilePath) await cleanupFile(tempFilePath);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const { page, limit, sort = "createdAt", search } = req.query;
    const hasPagination = page !== undefined && limit !== undefined;
    const limitNum = hasPagination ? parseInt(limit, 10) : null;
    const pageNum = hasPagination ? parseInt(page, 10) : null;

    let filter = {};
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter = {
        $or: [
          { name: searchRegex },
          { email: searchRegex },
        ],
      };
    }

    let query = User.find(filter).sort({ [sort]: -1 }).select("-password");

    if (hasPagination) {
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const users = await query.exec();
    const total = await User.countDocuments(filter);

    const response = {
      success: true,
      data: users,
      total,
    };

    if (hasPagination) {
      response.pages = Math.ceil(total / limitNum);
      response.currentPage = pageNum;
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  let tempFilePath = req.file?.path;

  try {
    const updates = {
      name: req.body.name,
      age: req.body.age,
      email: req.body.email,
      role: req.body.role,
      active: req.body.active,
      address: req.body.address,
    };

    Object.keys(updates).forEach(
      (key) => updates[key] === undefined && delete updates[key]
    );

    const existingUser = await User.findById(req.params.id);
    if (!existingUser) {
      if (tempFilePath) await cleanupFile(tempFilePath);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (
      tempFilePath &&
      existingUser.picture &&
      existingUser.picture !== "avatar.png"
    ) {
      await cleanupFile(existingUser.picture);
    }

    if (tempFilePath) {
      updates.picture = (await moveFile(tempFilePath)) || "avatar.png";
      tempFilePath = null;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      data: user,
      message: "User updated successfully",
    });
  } catch (error) {
    if (tempFilePath) await cleanupFile(tempFilePath);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.picture && user.picture !== "avatar.png") {
      await cleanupFile(user.picture);
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await user.comparePassword(req.body.oldPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect old password",
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete all users
const deleteAllUsers = async (req, res) => {
  try {
    const { confirm } = req.query;
    if (confirm !== "DELETE_ALL") {
      return res.status(400).json({
        success: false,
        message:
          "Confirmation required. Provide ?confirm=DELETE_ALL in the query.",
      });
    }

    const result = await User.deleteMany({});

    res.status(200).json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
      },
      message: `Successfully deleted ${result.deletedCount} users`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to delete users: ${error.message}`,
    });
  }
};

// Update active status
const updateActiveStatus = async (req, res) => {
  try {
    const existingUser = await User.findById(req.params.id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    existingUser.active = !existingUser.active;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { active: existingUser.active },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      data: user,
      message: "User updated successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  loginUser,
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changePassword,
  deleteAllUsers,
  updateActiveStatus,
};