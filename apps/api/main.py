from copy import deepcopy #to prevent reuse and mutation of default JOSN object
from pathlib import Path
from typing import Any, Literal

import json
from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response  # For downloading/exporting the LIF file
from pydantic import BaseModel, Field, ConfigDict, ValidationError


app = FastAPI(title="Dashboard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
ROBOTS_FILE = DATA_DIR / "robots.json"
LIF_FILE = DATA_DIR / "layout.lif.json"

def default_lif_payload() -> dict[str, Any]:
    return {
        "metaInformation": {
            "projectIdentification": "Dashboard Demo",
            "creator": "Dashboard API",
            "lifVersion": "1.0.0",
        },
        "layouts": [],
    }


class Coords(BaseModel):
    x: float
    y: float
    z: float = 0.0


class RobotWaypoint(Coords):
    id: str | int
    label: str | None = None


class RobotConfig(BaseModel):
    id: str
    name: str | None = None
    position: Coords | None = None
    target: Coords | None = None
    path: list[RobotWaypoint] | None = None
    startWaypointIndex: int = 0
    loop: bool = False
    speed: float = 1.0
    enabled: bool = True
    rotationZ: float = 0.0
    scale: float | dict[str, float] = 1.0
    coordinateSystem: Literal["navigation", "world"] = "world"


class RobotsResponse(BaseModel):
    coordinateSystem: Literal["navigation", "world"] = "world"
    robots: list[RobotConfig] = Field(default_factory=list)

#Validates that LIF file has the expected main shape
class LifDocument(BaseModel):
    model_config = ConfigDict(extra="allow")

    metaInformation: dict[str, Any] = Field(default_factory=dict)
    layouts: list[dict[str, Any]] = Field(default_factory=list)



def read_json_file(path: Path, default: Any) -> Any:
    if not path.exists():
        return deepcopy(default)  # Return a copy to prevent mutation of the default object

    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Invalid JSON in {path.name}: {exc}",
        ) from exc


def write_json_file(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)

    tmp_path = path.with_suffix(path.suffix + ".tmp")

    with tmp_path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, indent=2, ensure_ascii=False)

    tmp_path.replace(path)

def load_lif_document() -> LifDocument:
    payload = read_json_file(LIF_FILE, default=default_lif_payload())
    try:
        return LifDocument.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Invalid LIF document structure: {exc}",
        ) from exc

def save_lif_document(payload: LifDocument) -> LifDocument:
    data = payload.model_dump(mode="json")
    write_json_file(LIF_FILE, data)
    return payload

def lif_response(payload: LifDocument, filename: str = "layout.lif.json") -> Response:
    body = json.dumps(payload.model_dump(mode="json"), indent=2, ensure_ascii=False)
    return Response(
        content=body,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@app.get("/")
def root():
    return {"message": "FastAPI backend is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/scene")
def get_scene_config():
    return {
        "sceneUrl": "/RMF2_SIM/Test_3.glb",
        "robotModelUrl": "/robot.glb",
        "robotsConfigUrl": "/api/robots",
        "robotConfigRefreshMs": 1000,
        "lifEditorUrl": "/api/lif-editor/layout", #allows the frontend to fetch the LIF editor backend URL from the scene config
    }


@app.get("/api/robots", response_model=RobotsResponse)
def get_robots():
    payload = read_json_file(
        ROBOTS_FILE,
        default={
            "coordinateSystem": "world",
            "robots": [],
        },
    )

    # Supports both:
    # 1. [{...robot}]
    # 2. {"coordinateSystem": "world", "robots": [{...robot}]}
    if isinstance(payload, list):
        return {
            "coordinateSystem": "world",
            "robots": payload,
        }

    return payload


@app.put("/api/robots", response_model=RobotsResponse)
def update_robots(payload: RobotsResponse):
    data = payload.model_dump(mode="json")
    write_json_file(ROBOTS_FILE, data)
    return data


@app.get("/api/lif-editor/layout", response_model=LifDocument)
def get_lif_editor_layout():
    return load_lif_document()


@app.put("/api/lif-editor/layout", response_model=LifDocument)
def update_lif_editor_layout(payload: LifDocument):
    return save_lif_document(payload)

@app.post("/api/lif-editor/import", response_model=LifDocument)
async def import_lif_editor_layout(file: UploadFile = File(...)):
    filename = file.filename or "uploaded.lif.json"

    if not filename.endswith((".json", ".lif", ".lif.json")):
        raise HTTPException(
            status_code=400,
            detail="Only .json, .lif, or .lif.json files are supported.",
        )

    raw = await file.read()

    try:
        payload = json.loads(raw.decode("utf-8"))
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must be UTF-8 encoded.",
        ) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file is not valid JSON: {exc}",
        ) from exc

    try:
        lif_document = LifDocument.model_validate(payload)
    except ValidationError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded file is not a valid LIF document: {exc}",
        ) from exc

    return save_lif_document(lif_document)


@app.get("/api/lif-editor/export")
def export_current_lif_editor_layout():
    payload = load_lif_document()
    return lif_response(payload)


@app.post("/api/lif-editor/export")
def export_lif_editor_layout(payload: LifDocument):
    return lif_response(payload)


