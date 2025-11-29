# Supabase Storage Setup Guide

## ✅ What's Been Implemented

I've successfully integrated your `fbi_projects_files` storage bucket into your application. Here's what's now working:

### 1. **File Upload Functionality**
- Users can upload up to 5 images per project
- Drag & drop support with image preview
- File validation (max 10MB, image types only: PNG, JPG, GIF, WebP)
- Files are stored in organized paths: `projects/{user_id}/{timestamp}-{index}-{filename}`

### 2. **Image Display with Carousel**
- **Project Cards**: Show attachments at the top of each card
- **Project Detail Page**: Display attachments in a carousel below the project header
- **Review Page**: Show attachments when reviewing pending projects
- **Carousel Features**:
  - Single image: Clean, simple display
  - Multiple images: Swipeable carousel with navigation arrows
  - Dot indicators showing current position
  - Keyboard navigation (arrow keys)

### 3. **Database Integration**
- All database queries now include `project_attachments`
- Attachments are automatically linked to projects
- URLs are stored in the `project_attachments` table

### 4. **Components Created/Updated**
- ✅ `components/project-attachments-carousel.tsx` - New reusable carousel component
- ✅ `components/project-card.tsx` - Updated to show attachments
- ✅ `components/ui/carousel.tsx` - New shadcn carousel component
- ✅ `app/project/[id]/page.tsx` - Updated to display attachments
- ✅ `app/review/page.tsx` - Updated to show attachments in review
- ✅ `lib/supabase-storage.ts` - Updated to use `fbi_projects_files` bucket
- ✅ `lib/supabase.ts` - Updated all queries to include attachments

---

## 🔧 What You Need to Do

### Step 1: Set Up Storage Policies in Supabase

You need to configure access policies for your storage bucket. Choose one of these methods:

#### **Option A: Using the Supabase Dashboard (Recommended)**

1. Go to your Supabase Dashboard
2. Navigate to **Storage** → Select `fbi_projects_files` bucket
3. Go to **Configuration** → Ensure **Public bucket** is toggled ON
4. Click on the **Policies** tab
5. Click **New Policy** → Select **For full customization**
6. Create these four policies:

**Policy 1: Upload**
- Name: `Allow uploads to fbi_projects_files`
- Allowed operation: `INSERT`
- Policy definition:
```sql
bucket_id = 'fbi_projects_files'
```

**Policy 2: Download/View**
- Name: `Allow public access to fbi_projects_files`
- Allowed operation: `SELECT`
- Policy definition:
```sql
bucket_id = 'fbi_projects_files'
```

**Policy 3: Delete**
- Name: `Allow delete from fbi_projects_files`
- Allowed operation: `DELETE`
- Policy definition:
```sql
bucket_id = 'fbi_projects_files'
```

**Policy 4: Update (Optional)**
- Name: `Allow update to fbi_projects_files`
- Allowed operation: `UPDATE`
- Policy definition:
```sql
bucket_id = 'fbi_projects_files'
```

#### **Option B: Using SQL Editor**

Run the SQL file I created:
1. Go to Supabase Dashboard → **SQL Editor**
2. Copy the contents of `migrations/setup_storage_policies.sql`
3. Paste and click **Run**

### Step 2: Verify Bucket is Public

1. Go to **Storage** → `fbi_projects_files`
2. Click the bucket settings (gear icon)
3. Toggle **Public bucket** to **ON**

---

## 🧪 Testing

After setting up the policies, test the functionality:

1. **Create a Project with Images**:
   - Click "Create Project" on the main page
   - Fill in the title and summary
   - Upload 1-5 images (drag & drop or click to browse)
   - Submit the project

2. **Verify Display**:
   - Images should appear on the project card in the main listing
   - Click on the project to see the full carousel on the detail page
   - If you have admin access, check the review page to see images there too

3. **Test Carousel**:
   - For projects with multiple images, use navigation arrows
   - Try keyboard arrow keys to navigate
   - Check that dot indicators show correctly

---

## 📁 File Structure

```
fbi-agent-bot/
├── components/
│   ├── project-attachments-carousel.tsx  (NEW - Carousel component)
│   ├── project-card.tsx                  (UPDATED - Shows attachments)
│   └── ui/
│       └── carousel.tsx                  (NEW - Base carousel from shadcn)
├── lib/
│   ├── supabase-storage.ts              (UPDATED - Bucket name changed)
│   └── supabase.ts                      (UPDATED - Queries include attachments)
├── app/
│   ├── page.tsx                         (UPDATED - Interface includes attachments)
│   ├── project/[id]/page.tsx            (UPDATED - Displays attachments)
│   └── review/page.tsx                  (UPDATED - Shows attachments in review)
└── migrations/
    └── setup_storage_policies.sql       (NEW - SQL policies for storage)
```

---

## 🎨 Customization

You can customize the carousel appearance by modifying `project-attachments-carousel.tsx`:

- **Height**: Change `h-48` to adjust carousel height
- **Controls**: Pass `showControls={false}` to hide navigation arrows
- **Image Fit**: Change `object-cover` to `object-contain` for different image sizing
- **Border Radius**: Modify `rounded-lg` for different corner styles

Example usage:
```tsx
<ProjectAttachmentsCarousel
  attachments={project.project_attachments}
  className="max-w-2xl mx-auto"
  imageClassName="object-contain"
  showControls={true}
/>
```

---

## ⚠️ Troubleshooting

**Images not uploading?**
- Check that storage policies are set up correctly
- Verify the bucket is public
- Check browser console for errors

**Images not displaying?**
- Verify URLs are being stored in the database
- Check that queries include `project_attachments`
- Inspect the data returned from API endpoints

**Carousel not working?**
- Ensure embla-carousel packages are installed
- Check that multiple images exist for a project
- Verify navigation controls are enabled

---

## 🚀 Next Steps

Everything is now set up! Once you run the SQL policies in Supabase, your file upload and display functionality will be fully operational. Users can start attaching images to their projects, and they'll be beautifully displayed in carousels throughout your application.

