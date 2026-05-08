; Yaman AI Kurulum Betiği
[Setup]
AppId={{8A1F3C2B-4D5E-6G7H-8I9J-0K1L2M3N4O5P}
AppName=Yaman AI
AppVersion=1.0
AppPublisher=Yaman AI
DefaultDirName={userappdata}\Yaman AI
DefaultGroupName=Yaman AI
AllowNoIcons=yes
; Yönetici izni istememesi için
PrivilegesRequired=lowest
OutputDir=D:\yamannai
OutputBaseFilename=Yaman_AI_Setup
SetupIconFile=D:\yamannai\favicon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Ana uygulama dosyası
Source: "D:\yamannai\Yaman AI-win32-x64\Yaman AI.exe"; DestDir: "{app}"; Flags: ignoreversion
; Diğer tüm dosyalar
Source: "D:\yamannai\Yaman AI-win32-x64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Yaman AI"; Filename: "{app}\Yaman AI.exe"
Name: "{userdesktop}\Yaman AI"; Filename: "{app}\Yaman AI.exe"; Tasks: desktopicon

[Run]
; Hata burada düzeltildi: Flags parametresi doğru sıralamaya çekildi
Filename: "{app}\Yaman AI.exe"; Description: "{cm:LaunchProgram,Yaman AI}"; Flags: nowait postinstall skipifsilent