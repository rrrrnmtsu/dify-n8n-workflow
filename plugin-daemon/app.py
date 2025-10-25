from datetime import datetime
from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="Dify Plugin Daemon Stub", version="0.1.0")


def _plugin_response(data: Any) -> JSONResponse:
    return JSONResponse({"code": 0, "message": "", "data": data})


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/plugin/{tenant_id}/management/list")
async def list_plugins(tenant_id: str) -> JSONResponse:
    return _plugin_response({"list": [], "total": 0})


@app.get("/plugin/{tenant_id}/management/install/tasks")
async def list_install_tasks(tenant_id: str, page: int = 1, page_size: int = 100) -> JSONResponse:
    return _plugin_response([])


@app.get("/plugin/{tenant_id}/management/install/tasks/{task_id}")
async def get_install_task(tenant_id: str, task_id: str) -> JSONResponse:
    now = datetime.utcnow().isoformat() + "Z"
    task = {
        "id": task_id,
        "created_at": now,
        "updated_at": now,
        "status": "success",
        "total_plugins": 0,
        "completed_plugins": 0,
        "plugins": [],
    }
    return _plugin_response(task)


@app.post("/plugin/{tenant_id}/management/install/identifiers")
async def install_identifiers(tenant_id: str, request: Request) -> JSONResponse:
    return _plugin_response({"all_installed": True, "task_id": ""})


@app.post("/plugin/{tenant_id}/management/install/tasks/{task_id}/delete")
async def delete_install_task(tenant_id: str, task_id: str) -> JSONResponse:
    return _plugin_response(True)


@app.post("/plugin/{tenant_id}/management/install/tasks/delete_all")
async def delete_all_install_tasks(tenant_id: str) -> JSONResponse:
    return _plugin_response(True)


@app.post("/plugin/{tenant_id}/management/install/tasks/{task_id}/delete/{identifier}")
async def delete_install_task_item(tenant_id: str, task_id: str, identifier: str) -> JSONResponse:
    return _plugin_response(True)


@app.api_route("/{full_path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def catch_all(full_path: str, request: Request) -> JSONResponse:
    data: Any
    if request.method == "GET":
        data = []
    else:
        data = True
    return _plugin_response(data)
