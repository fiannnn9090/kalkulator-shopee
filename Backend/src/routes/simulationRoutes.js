const express = require('express');
const router = express.Router();
const simulationController = require('../controllers/simulationController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.post('/', simulationController.createSimulation);
router.get('/', simulationController.listSimulations);
router.get('/:id', simulationController.getSimulation);
router.put('/:id', simulationController.updateSimulation);
router.delete('/:id', simulationController.deleteSimulation);

module.exports = router;
