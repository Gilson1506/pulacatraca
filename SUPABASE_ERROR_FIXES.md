# 🔧 Supabase Storage and RLS Error Fixes

## 🚨 Problems Identified

Based on your console errors, you have two main issues:

1. **Storage RLS Error (400)**: `new row violates row-level security policy`
2. **Events Table Error (403)**: `Failed to load resource: the server responded with a status of 403`

## 🛠️ Solution

### Step 1: Run the Fix Script

Execute this SQL script in your Supabase SQL Editor:

```bash
# In your Supabase dashboard, go to SQL Editor and run:
fix_storage_and_rls_policies.sql
```

This script will:
- ✅ Create the `event_banners` storage bucket
- ✅ Set up proper storage policies for authenticated users
- ✅ Fix RLS policies for events table
- ✅ Fix RLS policies for event_ticket_types table
- ✅ Fix RLS policies for profiles table

### Step 2: Verify the Fixes

Run the verification script:

```bash
# In Supabase SQL Editor:
verify_fixes.sql
```

## 🔍 What Was Wrong

### Storage Issues
- The `event_banners` bucket didn't exist or had restrictive policies
- Storage policies were blocking authenticated users from uploading

### Events Table Issues
- RLS policies were too restrictive
- Users couldn't insert events even when authenticated
- Missing proper organizer role checks

## 🎯 Expected Results

After running the fixes, you should see:

### ✅ Storage Upload Success
```javascript
✅ Upload concluído: Object
🔗 URL pública: https://your-supabase-url/storage/v1/object/public/event_banners/...
```

### ✅ Event Creation Success
```javascript
🎫 EventFormModal - handleSubmit iniciado
🎫 EventFormModal - formData completo: Object
✅ Evento salvo com sucesso!
```

## 🔧 Manual Verification

If you want to check manually, run these queries in Supabase:

```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'event_banners';

-- Check storage policies
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Check events policies
SELECT * FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'events';

-- Check RLS status
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled 
FROM pg_tables 
WHERE tablename IN ('events', 'event_ticket_types', 'profiles');
```

## 🚨 If You Still Have Issues

### Authentication Problems
1. Make sure you're logged in
2. Check if your user has the correct role (`organizer` or `admin`)
3. Verify the JWT token is valid

### Permission Problems
1. Check browser console for detailed error messages
2. Verify the user ID matches the organizer_id in events
3. Make sure the profiles table has the correct user data

### Storage Problems
1. Check if the bucket is public
2. Verify file size is under 5MB
3. Confirm MIME type is allowed (jpeg, jpg, png, gif, webp)

## 🎉 Success Indicators

You'll know it's working when:
- ✅ No more 400 errors on bucket creation
- ✅ No more 403 errors on event saving
- ✅ Images upload successfully
- ✅ Events are created and saved
- ✅ No RLS policy violation messages

## 📞 Need Help?

If you're still having issues after running the fixes:

1. Check the verification script output
2. Look at browser console errors
3. Verify your authentication flow
4. Make sure your user profile has the correct role

The fixes address the most common RLS and storage policy issues in Supabase applications.