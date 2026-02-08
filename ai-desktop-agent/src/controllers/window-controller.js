/**
 * Window Controller Module
 * Manages window operations
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class WindowController {
    constructor() {
        this.platform = process.platform;
    }

    async getWindows() {
        try {
            if (this.platform === 'win32') {
                return await this.getWindowsWindows();
            } else if (this.platform === 'darwin') {
                return await this.getWindowsMac();
            } else if (this.platform === 'linux') {
                return await this.getWindowsLinux();
            }
            return [];
        } catch (error) {
            console.error('Get windows error:', error);
            return [];
        }
    }

    async getWindowsWindows() {
        const psScript = `
            Add-Type -AssemblyName System.Windows.Forms;
            $windows = @();
            foreach ($proc in Get-Process | Where-Object { $_.MainWindowHandle -ne 0 }) {
                $windows += @{
                    id = $proc.Id;
                    title = $proc.MainWindowTitle;
                    processName = $proc.ProcessName;
                };
            }
            $windows | ConvertTo-Json;
        `;
        const { stdout } = await execAsync(`powershell -Command "${psScript}"`);
        return JSON.parse(stdout);
    }

    async getWindowsMac() {
        const script = `
            tell application "System Events"
                set windowList to {}
                set procList to every process whose background only is false
                repeat with proc in procList
                    try
                        set procName to name of proc
                        set windowList to windowList & {id: id of proc, title: procName, processName: procName}
                    end try
                end repeat
                return windowList
            end tell
        `;
        const { stdout } = await execAsync(`osascript -e '${script}'`);
        return JSON.parse(stdout || '[]');
    }

    async getWindowsLinux() {
        try {
            const { stdout } = await execAsync('wmctrl -l');
            const lines = stdout.trim().split('\n');
            return lines.map((line, index) => {
                const parts = line.split(/\s+/);
                return {
                    id: parseInt(parts[0]),
                    title: parts.slice(3).join(' '),
                    processName: parts[2] || 'unknown'
                };
            });
        } catch {
            return [];
        }
    }

    async focusWindow(windowId) {
        try {
            if (this.platform === 'win32') {
                const psScript = `
                    $process = Get-Process -Id ${windowId};
                    if ($process) {
                        Add-Type -AssemblyName System.Windows.Forms;
                        [System.Windows.Forms.Application]::OpenForms | ForEach-Object {
                            if ($_.Handle -eq $process.MainWindowHandle) {
                                $_.BringToFront();
                                $_.Activate();
                            }
                        }
                    }
                `;
                await execAsync(`powershell -Command "${psScript}"`);
            } else if (this.platform === 'darwin') {
                await execAsync(`osascript -e 'tell application "System Events" to set frontmost of process id ${windowId} to true'`);
            } else if (this.platform === 'linux') {
                await execAsync(`wmctrl -i -a ${windowId}`);
            }
            return true;
        } catch (error) {
            console.error('Focus window error:', error);
            return false;
        }
    }

    async minimizeWindow(windowId) {
        try {
            if (this.platform === 'win32') {
                const psScript = `
                    $process = Get-Process -Id ${windowId};
                    if ($process) {
                        $process.CloseMainWindow();
                    }
                `;
                await execAsync(`powershell -Command "${psScript}"`);
            } else if (this.platform === 'darwin') {
                await execAsync(`osascript -e 'tell application "System Events" to set minimized of window 1 of process id ${windowId} to true'`);
            } else if (this.platform === 'linux') {
                await execAsync(`xdotool windowminimize ${windowId}`);
            }
            return true;
        } catch (error) {
            console.error('Minimize window error:', error);
            return false;
        }
    }

    async maximizeWindow(windowId) {
        try {
            if (this.platform === 'win32') {
                const psScript = `
                    Add-Type -AssemblyName System.Windows.Forms;
                    $process = Get-Process -Id ${windowId};
                    if ($process) {
                        $form = [System.Windows.Forms.Form]::FromHandle($process.MainWindowHandle);
                        if ($form) {
                            $form.WindowState = [System.Windows.Forms.FormWindowState]::Maximized;
                        }
                    }
                `;
                await execAsync(`powershell -Command "${psScript}"`);
            } else if (this.platform === 'darwin') {
                await execAsync(`osascript -e 'tell application "System Events" to tell process id ${windowId} to set zoomed of window 1 to true'`);
            } else if (this.platform === 'linux') {
                await execAsync(`xdotool windowmaximize ${windowId}`);
            }
            return true;
        } catch (error) {
            console.error('Maximize window error:', error);
            return false;
        }
    }

    async closeWindow(windowId) {
        try {
            if (this.platform === 'win32') {
                await execAsync(`taskkill /PID ${windowId} /F`);
            } else if (this.platform === 'darwin') {
                await execAsync(`kill ${windowId}`);
            } else if (this.platform === 'linux') {
                await execAsync(`kill ${windowId}`);
            }
            return true;
        } catch (error) {
            console.error('Close window error:', error);
            return false;
        }
    }

    async moveWindow(windowId, x, y) {
        try {
            if (this.platform === 'win32') {
                const psScript = `
                    Add-Type -AssemblyName System.Windows.Forms;
                    $process = Get-Process -Id ${windowId};
                    if ($process) {
                        $form = [System.Windows.Forms.Form]::FromHandle($process.MainWindowHandle);
                        if ($form) {
                            $form.Location = New-Object System.Drawing.Point(${x}, ${y});
                        }
                    }
                `;
                await execAsync(`powershell -Command "${psScript}"`);
            } else if (this.platform === 'darwin') {
                await execAsync(`osascript -e 'tell application "System Events" to set position of window 1 of process id ${windowId} to {${x}, ${y}}'`);
            } else if (this.platform === 'linux') {
                await execAsync(`xdotool windowmove ${windowId} ${x} ${y}`);
            }
            return true;
        } catch (error) {
            console.error('Move window error:', error);
            return false;
        }
    }

    async resizeWindow(windowId, width, height) {
        try {
            if (this.platform === 'win32') {
                const psScript = `
                    Add-Type -AssemblyName System.Windows.Forms;
                    $process = Get-Process -Id ${windowId};
                    if ($process) {
                        $form = [System.Windows.Forms.Form]::FromHandle($process.MainWindowHandle);
                        if ($form) {
                            $form.Size = New-Object System.Drawing.Size(${width}, ${height});
                        }
                    }
                `;
                await execAsync(`powershell -Command "${psScript}"`);
            } else if (this.platform === 'darwin') {
                await execAsync(`osascript -e 'tell application "System Events" to set size of window 1 of process id ${windowId} to {${width}, ${height}}'`);
            } else if (this.platform === 'linux') {
                await execAsync(`xdotool windowsize ${windowId} ${width} ${height}`);
            }
            return true;
        } catch (error) {
            console.error('Resize window error:', error);
            return false;
        }
    }

    async getWindowPosition(windowId) {
        try {
            if (this.platform === 'win32') {
                const psScript = `
                    Add-Type -AssemblyName System.Windows.Forms;
                    $process = Get-Process -Id ${windowId};
                    if ($process) {
                        $form = [System.Windows.Forms.Form]::FromHandle($process.MainWindowHandle);
                        if ($form) {
                            @{ x = $form.Location.X; y = $form.Location.Y } | ConvertTo-Json;
                        }
                    }
                `;
                const { stdout } = await execAsync(`powershell -Command "${psScript}"`);
                return JSON.parse(stdout);
            } else if (this.platform === 'darwin') {
                const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get position of window 1 of process id ${windowId}'`);
                const [x, y] = stdout.trim().split(', ').map(Number);
                return { x, y };
            } else if (this.platform === 'linux') {
                const { stdout } = await execAsync(`xdotool getwindowgeometry ${windowId}`);
                const match = stdout.match(/Position: (\d+),(\d+)/);
                if (match) {
                    return { x: parseInt(match[1]), y: parseInt(match[2]) };
                }
            }
            return { x: 0, y: 0 };
        } catch (error) {
            console.error('Get window position error:', error);
            return { x: 0, y: 0 };
        }
    }

    async getWindowSize(windowId) {
        try {
            if (this.platform === 'win32') {
                const psScript = `
                    Add-Type -AssemblyName System.Windows.Forms;
                    $process = Get-Process -Id ${windowId};
                    if ($process) {
                        $form = [System.Windows.Forms.Form]::FromHandle($process.MainWindowHandle);
                        if ($form) {
                            @{ width = $form.Size.Width; height = $form.Size.Height } | ConvertTo-Json;
                        }
                    }
                `;
                const { stdout } = await execAsync(`powershell -Command "${psScript}"`);
                return JSON.parse(stdout);
            } else if (this.platform === 'darwin') {
                const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get size of window 1 of process id ${windowId}'`);
                const [width, height] = stdout.trim().split(', ').map(Number);
                return { width, height };
            } else if (this.platform === 'linux') {
                const { stdout } = await execAsync(`xdotool getwindowgeometry ${windowId}`);
                const match = stdout.match(/Geometry: (\d+)x(\d+)/);
                if (match) {
                    return { width: parseInt(match[1]), height: parseInt(match[2]) };
                }
            }
            return { width: 0, height: 0 };
        } catch (error) {
            console.error('Get window size error:', error);
            return { width: 0, height: 0 };
        }
    }

    async getWindowState(windowId) {
        try {
            if (this.platform === 'win32') {
                const psScript = `
                    Add-Type -AssemblyName System.Windows.Forms;
                    $process = Get-Process -Id ${windowId};
                    if ($process) {
                        $form = [System.Windows.Forms.Form]::FromHandle($process.MainWindowHandle);
                        if ($form) {
                            $state = $form.WindowState.ToString();
                            @{ state = $state } | ConvertTo-Json;
                        }
                    }
                `;
                const { stdout } = await execAsync(`powershell -Command "${psScript}"`);
                const result = JSON.parse(stdout);
                return result.state.toLowerCase();
            } else if (this.platform === 'darwin') {
                const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get properties of window 1 of process id ${windowId}'`);
                if (stdout.includes('minimized:true')) return 'minimized';
                if (stdout.includes('zoomed:true')) return 'maximized';
                return 'normal';
            } else if (this.platform === 'linux') {
                const { stdout } = await execAsync(`xprop -id ${windowId} _NET_WM_STATE`);
                if (stdout.includes('_NET_WM_STATE_HIDDEN')) return 'minimized';
                if (stdout.includes('_NET_WM_STATE_MAXIMIZED')) return 'maximized';
                return 'normal';
            }
            return 'normal';
        } catch (error) {
            console.error('Get window state error:', error);
            return 'normal';
        }
    }

    async restoreWindow(windowId) {
        try {
            if (this.platform === 'win32') {
                const psScript = `
                    Add-Type -AssemblyName System.Windows.Forms;
                    $process = Get-Process -Id ${windowId};
                    if ($process) {
                        $form = [System.Windows.Forms.Form]::FromHandle($process.MainWindowHandle);
                        if ($form) {
                            $form.WindowState = [System.Windows.Forms.FormWindowState]::Normal;
                        }
                    }
                `;
                await execAsync(`powershell -Command "${psScript}"`);
            } else if (this.platform === 'darwin') {
                await execAsync(`osascript -e 'tell application "System Events" to tell process id ${windowId} to set zoomed of window 1 to false'`);
                await execAsync(`osascript -e 'tell application "System Events" to set minimized of window 1 of process id ${windowId} to false'`);
            } else if (this.platform === 'linux') {
                await execAsync(`wmctrl -i -r ${windowId} -b remove,maximized_vert,maximized_horz`);
                await execAsync(`xdotool windowactivate ${windowId}`);
            }
            return true;
        } catch (error) {
            console.error('Restore window error:', error);
            return false;
        }
    }

    async getMonitors() {
        try {
            if (this.platform === 'win32') {
                const psScript = `
                    Add-Type -AssemblyName System.Windows.Forms;
                    $monitors = @();
                    foreach ($screen in [System.Windows.Forms.Screen]::AllScreens) {
                        $monitors += @{
                            id = $screen.DeviceName;
                            primary = $screen.Primary;
                            bounds = @{
                                x = $screen.Bounds.X;
                                y = $screen.Bounds.Y;
                                width = $screen.Bounds.Width;
                                height = $screen.Bounds.Height;
                            };
                            workingArea = @{
                                x = $screen.WorkingArea.X;
                                y = $screen.WorkingArea.Y;
                                width = $screen.WorkingArea.Width;
                                height = $screen.WorkingArea.Height;
                            };
                        };
                    }
                    $monitors | ConvertTo-Json;
                `;
                const { stdout } = await execAsync(`powershell -Command "${psScript}"`);
                return JSON.parse(stdout);
            } else if (this.platform === 'darwin') {
                const { stdout } = await execAsync(`system_profiler SPDisplaysDataType -json`);
                const data = JSON.parse(stdout);
                return data.SPDisplaysDataType.map((display, index) => ({
                    id: index,
                    primary: index === 0,
                    bounds: {
                        x: 0,
                        y: 0,
                        width: display._spdisplays_resolution?.split(' x ')[0] || 1920,
                        height: display._spdisplays_resolution?.split(' x ')[1] || 1080
                    }
                }));
            } else if (this.platform === 'linux') {
                const { stdout } = await execAsync(`xrandr --query`);
                const monitors = [];
                const lines = stdout.split('\n');
                for (const line of lines) {
                    if (line.includes(' connected')) {
                        const match = line.match(/(\d+)x(\d+)\+(\d+)\+(\d+)/);
                        if (match) {
                            monitors.push({
                                id: monitors.length,
                                primary: line.includes('primary'),
                                bounds: {
                                    x: parseInt(match[3]),
                                    y: parseInt(match[4]),
                                    width: parseInt(match[1]),
                                    height: parseInt(match[2])
                                }
                            });
                        }
                    }
                }
                return monitors;
            }
            return [];
        } catch (error) {
            console.error('Get monitors error:', error);
            return [];
        }
    }

    async moveWindowToMonitor(windowId, monitorIndex) {
        try {
            const monitors = await this.getMonitors();
            if (monitorIndex >= monitors.length) {
                throw new Error(`Monitor index ${monitorIndex} out of range`);
            }
            const monitor = monitors[monitorIndex];
            const centerX = monitor.bounds.x + Math.floor(monitor.bounds.width / 2) - 400;
            const centerY = monitor.bounds.y + Math.floor(monitor.bounds.height / 2) - 300;
            return await this.moveWindow(windowId, centerX, centerY);
        } catch (error) {
            console.error('Move window to monitor error:', error);
            return false;
        }
    }

    async getWindowMonitor(windowId) {
        try {
            const position = await this.getWindowPosition(windowId);
            const monitors = await this.getMonitors();
            for (let i = 0; i < monitors.length; i++) {
                const monitor = monitors[i];
                if (position.x >= monitor.bounds.x &&
                    position.x < monitor.bounds.x + monitor.bounds.width &&
                    position.y >= monitor.bounds.y &&
                    position.y < monitor.bounds.y + monitor.bounds.height) {
                    return i;
                }
            }
            return 0;
        } catch (error) {
            console.error('Get window monitor error:', error);
            return 0;
        }
    }
}

module.exports = WindowController;
