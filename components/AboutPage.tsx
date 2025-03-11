import React, { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { arch, platform, version, type } from '@tauri-apps/api/os';
import { invoke } from '@tauri-apps/api/tauri';

interface SystemInfo {
    os: string;
    arch: string;
    version: string;
    type: string;
}

const REPO_URL = 'https://github.com/yourusername/sticky-notes-app';

export function AboutPage() {
    const [appVersion, setAppVersion] = useState<string>('');
    const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

    useEffect(() => {
        const loadInfo = async () => {
            try {
                // 获取应用版本
                const ver = await getVersion();
                setAppVersion(ver);

                // 获取系统信息
                const [osArch, osPlatform, osVersion, osType] = await Promise.all([
                    arch(),
                    platform(),
                    version(),
                    type(),
                ]);

                setSystemInfo({
                    os: osPlatform,
                    arch: osArch,
                    version: osVersion,
                    type: osType,
                });
            } catch (error) {
                console.error('Failed to load system info:', error);
            }
        };

        loadInfo();
    }, []);

    const handleOpenLink = async (url: string) => {
        try {
            await invoke('open_link', { url });
        } catch (error) {
            console.error('Failed to open link:', error);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">轻量级便签工具</h1>
                <p className="text-gray-500">版本 {appVersion}</p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">应用信息</h2>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-600">应用名称</span>
                        <span>轻量级便签工具</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">版本号</span>
                        <span>{appVersion}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">开发框架</span>
                        <span>Tauri + React</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">开发语言</span>
                        <span>Rust + TypeScript</span>
                    </div>
                </div>
            </div>

            {systemInfo && (
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">系统信息</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-600">操作系统</span>
                            <span>{systemInfo.type} ({systemInfo.os})</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">系统版本</span>
                            <span>{systemInfo.version}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">系统架构</span>
                            <span>{systemInfo.arch}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">开发者信息</h2>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-600">作者</span>
                        <span>开发团队</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">许可证</span>
                        <span>MIT</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">项目仓库</span>
                        <a
                            href="#"
                            className="text-blue-500 hover:text-blue-600"
                            onClick={(e) => {
                                e.preventDefault();
                                handleOpenLink(REPO_URL);
                            }}
                        >
                            GitHub
                        </a>
                    </div>
                </div>
            </div>

            <div className="text-center mt-8 text-sm text-gray-500">
                <p>Copyright © 2024 All Rights Reserved</p>
            </div>
        </div>
    );
} 