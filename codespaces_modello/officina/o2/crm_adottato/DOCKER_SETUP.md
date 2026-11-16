# Docker Setup Guide for Windows

## 1. Download Docker Desktop
Visit [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/) and download the "Windows" installer.

## 2. Install
Run the installer. Ensure "Use WSL 2" is selected if asked. You will likely need to **restart your computer** after installation.

## 3. Verify
After restarting, open "Docker Desktop" app. Wait for it to start.
Open PowerShell and type:
```powershell
docker --version
```

## 4. Run the CRM
Navigate to `sales-crm` folder:
```powershell
cd sales-crm
docker compose up --build
```
