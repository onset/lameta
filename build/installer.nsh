; electron-builder includes this in the Windows installer (nsis.include in electron-builder.json5).
;
; Alpha, beta and release can be installed side by side, and all of them register .sprj under
; one file class. Installing a channel points that class at the channel just installed, and so
; does launching one (src/mainProcess/fileAssociation.ts). electron-builder's own
; fileAssociations would delete the class when any channel is uninstalled, even while another
; channel owns it, so .sprj is handled here instead: uninstalling changes .sprj only if it
; opens the channel being removed, and then hands it to another installed channel.

!define SPRJ_CLASS_KEY "Software\Classes\lameta/lameta project"

!macro pointSprjAt EXE
  WriteRegStr HKCU "Software\Classes\.sprj" "" "lameta/lameta project"
  WriteRegStr HKCU "${SPRJ_CLASS_KEY}\DefaultIcon" "" '"${EXE}",0'
  WriteRegStr HKCU "${SPRJ_CLASS_KEY}\shell\open\command" "" '"${EXE}" "%1"'
  ; SHCNE_ASSOCCHANGED, so Explorer shows the new icon without a restart
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
!macroend

; Sets $1 to EXE if $1 is still empty and EXE is another channel that is installed.
!macro considerSprjOwner EXE
  ${if} $1 == ""
  ${andIf} "${EXE}" != "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  ${andIf} ${FileExists} "${EXE}"
    StrCpy $1 "${EXE}"
  ${endIf}
!macroend

!macro customInstall
  !insertmacro pointSprjAt "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
!macroend

!macro customUnInstall
  ; An update runs the old uninstaller first; the new installer takes .sprj right after.
  ${ifNot} ${isUpdated}
    ReadRegStr $0 HKCU "${SPRJ_CLASS_KEY}\shell\open\command" ""
    ; Installs made with electron-builder's own file association have no quotes around the exe.
    ${if} $0 == '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"'
    ${orIf} $0 == '$INSTDIR\${APP_EXECUTABLE_FILENAME} "%1"'
      StrCpy $1 ""
      !insertmacro considerSprjOwner "$LOCALAPPDATA\Programs\lameta\lameta.exe"
      !insertmacro considerSprjOwner "$LOCALAPPDATA\Programs\lameta-beta\lameta beta.exe"
      !insertmacro considerSprjOwner "$LOCALAPPDATA\Programs\lameta-alpha\lameta alpha.exe"
      ${if} $1 == ""
        DeleteRegKey HKCU "${SPRJ_CLASS_KEY}"
        DeleteRegValue HKCU "Software\Classes\.sprj" ""
        System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
      ${else}
        !insertmacro pointSprjAt "$1"
      ${endIf}
    ${endIf}
  ${endIf}
!macroend
