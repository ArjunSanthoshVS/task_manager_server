const Task = require("../models/task");

module.exports = {
    create: async (req, res) => {
        const { title, description } = req.body;
        try {
            const task = new Task({ title, description, user: req.user.id });
            await task.save();
            return res.status(201).json(task);
        } catch (err) {
            return res.status(400).json({ message: err.message });
        }
    },

    tasks: async (req, res) => {
        try {
            // Fetch all tasks for the logged-in user
            const tasks = await Task.find({ user: req.user.id });

            // Categorize tasks based on status
            const categorizedTasks = {
                TODO: tasks.filter(task => task.status === 'TODO'),
                PROGRESS: tasks.filter(task => task.status === 'PROGRESS'),
                DONE: tasks.filter(task => task.status === 'DONE'),
            };

            return res.status(200).json(categorizedTasks);
        } catch (err) {
            return res.status(400).json({ message: err.message });
        }
    },

    edit: async (req, res) => {
        try {
            const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
            return res.status(200).json(task);
        } catch (err) {
            return res.status(400).json({ message: err.message });
        }
    },

    delete: async (req, res) => {
        try {
            await Task.findByIdAndDelete(req.params.id);
            return res.status(200).json({ message: 'Task deleted' });
        } catch (err) {
            return res.status(400).json({ message: err.message });
        }
    },

}