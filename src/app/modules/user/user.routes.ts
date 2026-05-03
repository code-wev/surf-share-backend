import { Router } from 'express';

import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';

const router = Router();

router.post('/register/surfer', validateRequest(UserValidation.registerSurfer), UserController.registerSurfer);
router.post('/register/photographer', validateRequest(UserValidation.registerPhotographer), UserController.registerPhotographer);
router.post('/register/moderator', validateRequest(UserValidation.registerModerator), UserController.registerModerator);

router.post('/login', validateRequest(UserValidation.login), UserController.loginUser);

// CRUD routes
router.get('/', auth('ADMIN', 'MODERATOR'), UserController.getAllUsers);
router.get('/:id', auth(), UserController.getUserById);
router.patch('/:id', auth(), validateRequest(UserValidation.updateUser), UserController.updateUser);
router.delete('/:id', auth('ADMIN'), UserController.deleteUser);

export const UserRoutes = router;
