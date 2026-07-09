# lameta and OneDrive

If your lameta project lives inside a OneDrive folder, OneDrive may keep some
of your files "in the cloud" instead of on your computer. This saves disk
space: a file that is *online-only* takes up almost no room, but its actual
content (the recording, the video, the photo…) is not on your computer until
OneDrive downloads it.

lameta understands these cloud files and will never download a big file
without being asked. This page explains what you will see and how to get a
file onto your computer when you need it.

## What you will see in the file list

Next to each file, lameta shows the same kind of icons that Windows File
Explorer uses:

- **Blue cloud** — the file is online-only. Its content is in the cloud, not
  on this computer. Its name is also shown dimmed.
- **Spinning arrows** — you (or lameta) asked for this file, and OneDrive is
  downloading it.
- **Grey crossed-out cloud** — the file is online-only *and* your computer is
  currently offline, so it cannot be downloaded right now.
- **No icon** — the file is on your computer and ready to use.

Your session and person information always works, even when files are
online-only. lameta automatically keeps its own small record-keeping files on
your computer, so you can always see and edit titles, dates, contributors,
notes, and so on. Only the large files (audio, video, images, documents) wait
in the cloud.

## Getting a file onto your computer

1. Click the file in the list. Instead of the usual preview, you will see a
   box titled **OneDrive Status**.
2. Tick **"Tell OneDrive that I want this file on my computer"**.
3. The status changes to **Waiting**. OneDrive downloads the file in the
   background — how long this takes depends on the file size and your
   internet connection. lameta shows the file as soon as it arrives.

Changed your mind? Untick the box to cancel the request. (This never removes
anything from your computer or from the cloud.)

## Downloading small files automatically

Downloading every tiny file by hand would be tedious, so lameta can request
small files for you. In the **View** menu, choose **"Automatically make cloud
files available if smaller than"** and pick a size (for example 10 MB). From
then on, when you click an online-only file smaller than that, lameta asks
OneDrive for it automatically. Choose **Never** to turn this off, or
**Always** if you want every file you click to be downloaded regardless of
size.

## When you are offline

If your computer has no internet connection, online-only files show a
crossed-out cloud, and the OneDrive Status box explains that the file cannot
be downloaded right now. You can still tick the box — OneDrive will remember
and download the file once you are connected again.

## Freeing up disk space

You can hand space back to the cloud at any time: in Windows File Explorer,
right-click a file (or a whole session folder) and choose **Free up space**.
The files become online-only again.

One thing to know: the next time you open such a session in lameta, lameta
immediately re-downloads its own small record-keeping files (they are tiny —
usually just a few kilobytes) so it can show you the session's information.
Your recordings and other large files stay in the cloud until you ask for
them.

## Good to know

- This feature works with **OneDrive on Windows**. On other systems, or with
  other cloud services, lameta treats files normally.
- lameta never deletes or "de-downloads" anything. Moving files back to the
  cloud is always something you do yourself, in Windows File Explorer.
- Hover over any status icon to see a short explanation.
