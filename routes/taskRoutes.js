const express = require('express');
const protect = require('../middlewares/authMiddleware');
const taskController = require('../controllers/taskController');
const router = express.Router();

/* GET users listing. */
router.post('/', protect, taskController.create);
router.get('/', protect, taskController.tasks);
router.put('/:id', protect, taskController.edit);
router.delete('/:id', protect, taskController.delete);

module.exports = router;
