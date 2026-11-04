KAYTIA FLOW

FIRST TIME
  Double-click KaytiaFlow.exe. It installs itself to C:\KaytiaFlow and puts a
  "Kaytia POS" shortcut on your desktop. From then on, use the shortcut.
  Keep the small window open while you work. Close it to stop Kaytia Flow.

  Windows may say "Windows protected your PC", because the program isn't digitally
  signed yet. Press More info, then Run anyway.

UPDATING
  Double-click KaytiaFlow_Update.exe on each computer. It closes Kaytia Flow, replaces the
  program in C:\KaytiaFlow and starts it again. Then refresh the browser page.
  Your sales, stock, staff and settings are not touched, but take a backup first under
  Settings > Backup and restore.
  The old version is kept as C:\KaytiaFlow\KaytiaFlow.previous.exe.
  Update the Main first, then the tills, when nobody is in the middle of a sale.

CONNECTING COMPUTERS
  On the computer that will stay on (the Main):
    1. Run KaytiaFlow.exe and choose "The Main computer".
    2. Note the address and connect code it shows.
    3. If Windows Firewall asks, allow it on private networks. If tills can't connect
       later, open Command Prompt as administrator on the Main and run:
       netsh advfirewall firewall add rule name="Kaytia Flow" dir=in action=allow protocol=TCP localport=5500 profile=private

  On every other computer (a till):
    1. Run KaytiaFlow.exe and choose "A till".
    2. Enter the Main's address and the code. The till takes on the Main's data.

  To see these again: Settings > Network > Connect computers.

HOW SHARING WORKS
  - Changes reach the other computers within a few seconds.
  - If the network or the Main goes down, tills keep selling and catch up afterwards.
  - Don't open and settle the same bill on two computers at the same moment.
  - With tills connected, each computer has its own bill number series, so numbers
    jump (for example 00020, 00040 on one computer and 00021, 00041 on another).
  - Each computer needs its own license, machine name and printer setup.
  - Files attached to staff records stay on the computer they were added on.

WHERE YOUR DATA IS (on the Main)
  C:\KaytiaFlow\data       the shared data
  C:\KaytiaFlow\backups    a backup for each day, kept for 60 days
  Copy the backups folder somewhere else from time to time, such as a USB drive.
  These files hold salaries and staff PINs, so keep them private.

MOVING OR RESTORING
  Settings > Backup and restore. Restoring on a connected computer replaces the data
  on all connected computers.

EMAIL (optional)
  Copy kaytia.env.example to C:\KaytiaFlow\kaytia.env, fill in your mail account and
  restart Kaytia POS.

PRINTERS
  Set up under Settings > Printers on each computer.
