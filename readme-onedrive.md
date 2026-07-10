# Using lameta with Cloud Sync services (OneDrive, Dropbox, Google Drive, iCloud, etc.)

If your lameta project lives inside a folder managed by a cloud sync service,
that service may keep some of your files "in the cloud" instead of on your
computer. This saves disk space: a file that is *online-only* takes up almost
no room, but its actual content (the recording, the video, the photo…) is not
on your computer until the cloud service downloads it.

lameta understands these cloud files and will never download a big file
without being asked. This page explains what you will see and how to get a
file onto your computer when you need it.

The screenshots below happen to show OneDrive, but lameta works the same way
with any of these services — the status box simply shows the name of whichever
service is managing your folder.

## What you will see in the file list

Next to each file, lameta shows the same kind of icons that Windows File
Explorer uses:

- **Blue cloud** — the file is online-only. Its content is in the cloud, not
on this computer. Its name is also shown dimmed.
- **Spinning arrows** — you (or lameta) asked for this file, and the cloud
service is downloading it.
- **Grey crossed-out cloud** — the file is online-only *and* your computer is
currently offline, so it cannot be downloaded right now.
- **No icon** — the file is on your computer and ready to use.

![The file list: the session file is online-only (blue cloud, dimmed), the first
recording is being downloaded (spinning arrows), and the two files below it are
already on this computer (no icon)](readme-images/onedrive-file-list-icons.png)

Your session and person information always works, even when files are
online-only. lameta automatically keeps its own small record-keeping files on
your computer, so you can always see and edit titles, dates, contributors,
notes, and so on. Only the large files (audio, video, images, documents) wait
in the cloud.

## Getting a file onto your computer

1. Click the file in the list. Instead of the usual preview, you will see a
 box titled with your cloud service's name — for example **OneDrive Status**
 or **Dropbox Status**.
  ![The status box for an online-only file, with the checkbox not
   yet ticked](readme-images/onedrive-status-card.png)
2. Tick **"Tell [your cloud service] that I want this file on my computer"**.
3. The status changes to **Waiting**. The cloud service downloads the file in
 the background — how long this takes depends on the file size and your
 internet connection. lameta shows the file as soon as it arrives.
  ![The status box after ticking the checkbox: the status is
   Waiting, and lameta notes when you requested the
   file](readme-images/onedrive-status-card-waiting.png)

Changed your mind? Untick the box to cancel the request. (This never removes
anything from your computer or from the cloud.)

## Downloading small files automatically

Downloading every tiny file by hand would be tedious, so lameta can request
small files for you. In the **View** menu, choose **"Automatically make cloud
files available if smaller than"** and pick a size (for example 10 MB). From
then on, when you click an online-only file smaller than that, lameta asks the
cloud service for it automatically. Choose **Never** to turn this off, or
**Always** if you want every file you click to be downloaded regardless of
size.

## When you are offline

If your computer has no internet connection, online-only files show a
crossed-out cloud, and the status box explains that the file cannot
be downloaded right now. You can still tick the box — the cloud service will
remember and download the file once you are connected again.

![The status box while offline: a crossed-out cloud and a note that
this computer appears to be offline](readme-images/onedrive-status-card-offline.png)

## Freeing up disk space

You can hand space back to the cloud at any time: in Windows File Explorer,
right-click a file (or a whole session folder) and choose **Free up space**
(the exact wording depends on your cloud service). The files become
online-only again.

One thing to know: the next time you open such a session in lameta, lameta
immediately re-downloads its own small record-keeping files (they are tiny —
usually just a few kilobytes) so it can show you the session's information.
Your recordings and other large files stay in the cloud until you ask for
them.

## Good to know

- This feature works with cloud sync services on **Windows** that use the
built-in Windows Cloud Files system — including OneDrive, Dropbox, Google
Drive, iCloud Drive, and Box. On other systems, or with services that don't
use this system, lameta treats files normally.
- lameta never deletes or "de-downloads" anything. Moving files back to the
cloud is always something you do yourself, in Windows File Explorer.
- Hover over any status icon to see a short explanation.
