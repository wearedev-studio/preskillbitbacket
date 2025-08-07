import { Router } from 'express';
import {
    createAdminRoom,
    getActiveRooms,
    deleteRoom,
    createTournament,
    updateTournament,
    deleteTournament,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getAllTransactions,
    getAllGameRecords,
    getKycSubmissions,
    reviewKycSubmission,
    getKycDocument
} from '../controllers/admin.controller';
import { adminProtect } from '../middleware/admin.middleware';

const router = Router();

router.route('/create-room').post(adminProtect, createAdminRoom);
router.route('/rooms').get(adminProtect, getActiveRooms);
router.route('/rooms/:roomId').delete(adminProtect, deleteRoom);
router.route('/tournaments').post(adminProtect, createTournament);
router.route('/tournaments/:id')
    .put(adminProtect, updateTournament)
    .delete(adminProtect, deleteTournament);

router.route('/users').get(adminProtect, getAllUsers);
router.route('/users/:id')
    .get(adminProtect, getUserById)
    .put(adminProtect, updateUser)
    .delete(adminProtect, deleteUser);

router.route('/transactions').get(adminProtect, getAllTransactions);
router.route('/games').get(adminProtect, getAllGameRecords);

router.route('/kyc-submissions').get(adminProtect, getKycSubmissions);
router.route('/kyc-submissions/:userId/review').post(adminProtect, reviewKycSubmission);

router.route('/kyc-document/:userId/:fileName').get(adminProtect, getKycDocument);

export default router;
