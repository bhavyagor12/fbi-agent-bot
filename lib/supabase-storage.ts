import { supabaseServer } from "./supabase";

const BUCKET_NAME = "project-attachments";

/**
 * Upload a file to Supabase Storage
 */
export async function uploadFile(
    file: File,
    path: string
): Promise<{ url: string | null; error: Error | null }> {
    try {
        // Upload file
        const { data, error: uploadError } = await supabaseServer.storage
            .from(BUCKET_NAME)
            .upload(path, file, {
                cacheControl: "3600",
                upsert: false,
            });

        if (uploadError) {
            return { url: null, error: uploadError };
        }

        // Get public URL
        const {
            data: { publicUrl },
        } = supabaseServer.storage.from(BUCKET_NAME).getPublicUrl(data.path);

        return { url: publicUrl, error: null };
    } catch (error) {
        return { url: null, error: error as Error };
    }
}

/**
 * Upload multiple files to Supabase Storage
 */
export async function uploadFiles(
    files: File[],
    basePath: string
): Promise<Array<{ url: string; media_type: string }>> {
    const uploadPromises = files.map(async (file, index) => {
        const timestamp = Date.now();
        const filename = `${timestamp}-${index}-${file.name}`;
        const path = `${basePath}/${filename}`;

        const { url, error } = await uploadFile(file, path);

        if (error || !url) {
            console.error(`Failed to upload ${file.name}:`, error);
            return null;
        }

        return {
            url,
            media_type: file.type,
        };
    });

    const results = await Promise.all(uploadPromises);
    return results.filter(
        (result): result is { url: string; media_type: string } => result !== null
    );
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFile(path: string) {
    const { error } = await supabaseServer.storage
        .from(BUCKET_NAME)
        .remove([path]);

    if (error) {
        console.error("Error deleting file:", error);
        return { success: false, error };
    }

    return { success: true, error: null };
}

/**
 * Delete multiple files from Supabase Storage
 */
export async function deleteFiles(paths: string[]) {
    const { error } = await supabaseServer.storage
        .from(BUCKET_NAME)
        .remove(paths);

    if (error) {
        console.error("Error deleting files:", error);
        return { success: false, error };
    }

    return { success: true, error: null };
}

/**
 * Validate file type and size
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.",
        };
    }

    if (file.size > maxSize) {
        return {
            valid: false,
            error: "File size exceeds 10MB limit.",
        };
    }

    return { valid: true };
}
