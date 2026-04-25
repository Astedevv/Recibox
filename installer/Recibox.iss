#define MyAppName "ReciBox"
#define MyAppVersion "1.0.2"
#define MyAppPublisher "Astedevv"
#define MyAppExeName "ReciBox.exe"
#define MySourceDir "..\release\win-unpacked"
#define MyIconFile "..\assets\recibox.ico"

[Setup]
AppId=Recibox
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputDir=..\release\installer
OutputBaseFilename=ReciBox-Setup
SetupIconFile={#MyIconFile}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\resources\recibox.ico

[Tasks]
Name: "desktopicon"; Description: "Criar ícone na área de trabalho"; GroupDescription: "Atalhos:"; Flags: unchecked

[Files]
Source: "{#MySourceDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#MyIconFile}"; DestDir: "{app}\resources"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\resources\recibox.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\resources\recibox.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Abrir o ReciBox"; Flags: nowait postinstall skipifsilent
