import { bot } from "../../telegram-bot";

/**
 * Fetch user's Telegram profile picture URL
 * Returns the URL of the user's profile photo or null if no photo exists
 */
export async function getTelegramProfilePicture(
    telegramUserId: number
): Promise<string | null> {
    try {
        // Get user profile photos
        const photos = await bot.api.getUserProfilePhotos(telegramUserId, {
            limit: 1,
        });

        if (photos.total_count === 0 || photos.photos.length === 0) {
            console.log(`[AVATAR] No profile photo for user ${telegramUserId}`);
            return null;
        }

        // Get the largest version of the first photo
        const photoSizes = photos.photos[0];
        const largestPhoto = photoSizes[photoSizes.length - 1];

        // Get the file path
        const file = await bot.api.getFile(largestPhoto.file_id);

        if (!file.file_path) {
            console.log(`[AVATAR] No file path for photo of user ${telegramUserId}`);
            return null;
        }

        // Construct the URL
        const photoUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

        console.log(`[AVATAR] Got profile photo URL for user ${telegramUserId}`);
        return photoUrl;
    } catch (error) {
        console.error(`[AVATAR] Error fetching profile photo for user ${telegramUserId}:`, error);
        return null;
    }
}
