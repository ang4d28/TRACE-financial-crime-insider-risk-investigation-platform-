# TRACE Server Status

## ✅ Servers Running

### Backend (FastAPI + Uvicorn)
- **Status**: ✅ Running
- **URL**: http://localhost:8000
- **Process ID**: term_1790677644286_7nwuvh6u8ra
- **Health Check**: ✅ Passing
  ```json
  {"status":"ok","service":"TRACE"}
  ```

### Frontend (Vite + React)
- **Status**: ✅ Running
- **URL**: http://localhost:5176 (ports 5173-5175 were in use)
- **Process ID**: term_1790677657919_d927ffuvkcg
- **Framework**: Vite v8.3.1
- **Ready**: ✅ Yes (1690ms startup time)

## ⚠️ Database Status

### PostgreSQL
- **Status**: ❌ Not Running
- **Expected**: postgresql://postgres:postgres@localhost:5432/trace
- **Impact**: 
  - Health endpoint works (no DB required)
  - Data endpoints will timeout (alerts, cases, graph, timeline, metrics)
  - Frontend will load but show "Loading..." or errors when fetching data

## How to Start PostgreSQL

### Option 1: Windows Service (if installed as service)
```powershell
Start-Service postgresql-x64-XX
```

### Option 2: Manual Start (if installed standalone)
```powershell
# Navigate to PostgreSQL bin directory
cd "C:\Program Files\PostgreSQL\XX\bin"
# Start server
.\pg_ctl -D "C:\Program Files\PostgreSQL\XX\data" start
```

### Option 3: Docker (recommended for development)
```powershell
docker run -d `
  --name trace-postgres `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=trace `
  -p 5432:5432 `
  postgres:15
```

## After Starting PostgreSQL

1. **Run migrations**:
   ```powershell
   cd backend
   .\.venv\Scripts\Activate.ps1
   alembic upgrade head
   ```

2. **Generate synthetic data**:
   ```powershell
   cd data
   python scripts/generate_data.py
   ```

3. **Test the system**:
   - Navigate to: http://localhost:5176
   - Click "Enter Dashboard"
   - You should see the dashboard with cases

## Current Access

### Without Database
- ✅ Home page: http://localhost:5176
- ✅ Health check: http://localhost:8000/health
- ✅ API docs: http://localhost:8000/docs
- ❌ Dashboard (will show loading/errors)
- ❌ Cases (no data)
- ❌ Metrics (no data)

### With Database Running
- ✅ Full dashboard functionality
- ✅ Case list and details
- ✅ Graph explorer
- ✅ Timeline view
- ✅ Metrics dashboard
- ✅ AI verification calls
- ✅ PDF export

## Quick Test Commands

### Check Backend
```powershell
curl http://localhost:8000/health -UseBasicParsing
```

### Check Frontend
Open browser: http://localhost:5176

### Check Database Connection
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -c "from app.database import SessionLocal; db = SessionLocal(); print('DB connected'); db.close()"
```

## Stop Servers

To stop the running servers, use Ctrl+C in their respective terminals or:

```powershell
# List processes
Get-Process -Name python, node | Where-Object {$_.Path -like "*TRACE*"}

# Kill specific process
Stop-Process -Id <PID>
```

## Routes Fixed

All route navigation issues have been resolved:
- ✅ `/dashboard` - Dashboard page
- ✅ `/dashboard/cases` - Cases list
- ✅ `/dashboard/cases/:id` - Case detail
- ✅ `/dashboard/graph` - Graph explorer
- ✅ `/dashboard/metrics` - Metrics dashboard

## Next Steps

1. **Start PostgreSQL** (see options above)
2. **Run migrations**: `alembic upgrade head`
3. **Generate data**: `python data/scripts/generate_data.py`
4. **Access dashboard**: http://localhost:5176
5. **Test metrics**: http://localhost:5176/dashboard/metrics

---

**Last Updated**: Server startup completed successfully
**Backend**: Running on port 8000
**Frontend**: Running on port 5176
**Database**: Not connected (needs PostgreSQL)
