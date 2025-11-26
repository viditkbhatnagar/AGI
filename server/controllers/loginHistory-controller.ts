import { Request, Response } from 'express';
import { User } from '../models/user';
import { Student } from '../models/student';
import { Enrollment } from '../models/enrollment';

/**
 * Get all students with their login history
 * Supports pagination, filtering (name, date range, course), and sorting
 */
export const getStudentsLoginHistory = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, name, startDate, endDate, courseSlug } = req.query;

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        // Build query for users with role 'student'
        const userQuery: any = { role: 'student' };

        // Get all student users
        let studentUsers = await User.find(userQuery)
            .select('username email loginHistory')
            .lean();

        // Get student details (name, phone) for each user
        const enrichedData = await Promise.all(
            studentUsers.map(async (user) => {
                const student = await Student.findOne({ userId: user._id })
                    .select('name phone')
                    .lean();

                if (!student) return null;

                // Get enrollments for course filtering
                let enrollments: any[] = [];
                if (courseSlug) {
                    enrollments = await Enrollment.find({
                        student: student._id,
                        courseSlug: courseSlug as string
                    }).lean();
                }

                // Filter by course if specified
                if (courseSlug && enrollments.length === 0) {
                    return null;
                }

                return {
                    _id: user._id,
                    name: student.name,
                    phone: student.phone || 'N/A',
                    email: user.email,
                    username: user.username,
                    loginHistory: user.loginHistory || [],
                };
            })
        );

        // Filter out null values and apply name filter
        let filteredData = enrichedData.filter((item) => item !== null) as any[];

        if (name) {
            const nameFilter = (name as string).toLowerCase();
            filteredData = filteredData.filter((item) =>
                item.name.toLowerCase().includes(nameFilter)
            );
        }

        // Filter by date range
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate as string) : null;
            const end = endDate ? new Date(endDate as string) : null;

            filteredData = filteredData.filter((item) => {
                if (!item.loginHistory || item.loginHistory.length === 0) return false;

                // Check if any login falls within the date range
                return item.loginHistory.some((login: any) => {
                    const loginDate = new Date(login.timestamp);
                    if (start && loginDate < start) return false;
                    if (end && loginDate > end) return false;
                    return true;
                });
            });
        }

        // Sort by most recent login (users with most recent logins first)
        filteredData.sort((a, b) => {
            const aLatest = a.loginHistory?.[0]?.timestamp;
            const bLatest = b.loginHistory?.[0]?.timestamp;

            if (!aLatest && !bLatest) return 0;
            if (!aLatest) return 1; // Users without logins go to the end
            if (!bLatest) return -1;

            return new Date(bLatest).getTime() - new Date(aLatest).getTime();
        });

        // Apply pagination
        const total = filteredData.length;
        const paginatedData = filteredData.slice(skip, skip + limitNum);

        res.status(200).json({
            users: paginatedData,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (error) {
        console.error('Get students login history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get all teachers (and admins) with their login history
 * Supports pagination, filtering (name, date range), and sorting
 */
export const getTeachersLoginHistory = async (req: Request, res: Response) => {
    try {
        const { page = 1, limit = 10, name, startDate, endDate } = req.query;

        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        // Build query for users with role 'teacher', 'admin', or 'superadmin'
        const userQuery: any = {
            role: { $in: ['teacher', 'admin', 'superadmin'] }
        };

        // Get all teacher/admin users
        let teacherUsers = await User.find(userQuery)
            .select('username email loginHistory role')
            .lean();

        let filteredData = teacherUsers.map((user) => ({
            _id: user._id,
            name: user.username, // Teachers don't have a separate name field, use username
            email: user.email,
            username: user.username,
            role: user.role,
            loginHistory: user.loginHistory || [],
        }));

        // Apply name filter
        if (name) {
            const nameFilter = (name as string).toLowerCase();
            filteredData = filteredData.filter((item) =>
                item.username.toLowerCase().includes(nameFilter) ||
                item.email.toLowerCase().includes(nameFilter)
            );
        }

        // Filter by date range
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate as string) : null;
            const end = endDate ? new Date(endDate as string) : null;

            filteredData = filteredData.filter((item) => {
                if (!item.loginHistory || item.loginHistory.length === 0) return false;

                // Check if any login falls within the date range
                return item.loginHistory.some((login: any) => {
                    const loginDate = new Date(login.timestamp);
                    if (start && loginDate < start) return false;
                    if (end && loginDate > end) return false;
                    return true;
                });
            });
        }

        // Sort by most recent login (users with most recent logins first)
        filteredData.sort((a, b) => {
            const aLatest = a.loginHistory?.[0]?.timestamp;
            const bLatest = b.loginHistory?.[0]?.timestamp;

            if (!aLatest && !bLatest) return 0;
            if (!aLatest) return 1; // Users without logins go to the end
            if (!bLatest) return -1;

            return new Date(bLatest).getTime() - new Date(aLatest).getTime();
        });

        // Apply pagination
        const total = filteredData.length;
        const paginatedData = filteredData.slice(skip, skip + limitNum);

        res.status(200).json({
            users: paginatedData,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    } catch (error) {
        console.error('Get teachers login history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
