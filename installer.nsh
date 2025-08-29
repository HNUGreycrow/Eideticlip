!include "LogicLib.nsh"
!include nsDialogs.nsh

Function .onVerifyInstDir
  ${IfNot} ${FileExists} "$INSTDIR\${PRODUCT_NAME}\*"
    StrCpy $INSTDIR "$INSTDIR\${PRODUCT_NAME}"
  ${EndIf}
FunctionEnd
