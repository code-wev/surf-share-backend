import { Router } from 'express';

import validateRequest from '../../middlewares/validateRequest';
import { UserController } from './user.controller';
import { UserValidation } from './user.validation';

const router = Router();

router.post('/register', validateRequest(UserValidation.register), UserController.registerUser);
router.post('/login', validateRequest(UserValidation.login), UserController.loginUser);

export const UserRoutes = router;
