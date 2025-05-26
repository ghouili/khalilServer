const express = require("express");
const router = express.Router();

const { fileUploader } = require("../middlewares/Fileuploader");
// const { authMiddleware, adminMiddleware } = require("../middlewares/auth");
const userController = require("../controllers/user");

// Public routes
router.post(
  "/create",
  fileUploader.single("picture"),
  userController.createUser
);
router.post("/login", userController.loginUser); // Added login route

// Protected routes (require authentication)
// router.use(authMiddleware);

router.get("/activatestatus/:id", userController.updateActiveStatus);
// User routes
router.get("/:id", userController.getUserById);
router.put("/:id", fileUploader.single("picture"), userController.updateUser);
router.post("/:id/password", userController.changePassword);

// Admin-only routes
// router.use(adminMiddleware);

router.get("/", userController.getAllUsers);
router.post("/", fileUploader.single("picture"), userController.createUser);

router.delete("/all", userController.deleteAllUsers);
router.delete("/one/:id", userController.deleteUser);

module.exports = router;
