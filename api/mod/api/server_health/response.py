from datetime import datetime

from pydantic import BaseModel, Field


class ServerHostInfo(BaseModel):
    hostname: str
    platform: str
    boot_time: datetime
    uptime_seconds: int


class ServerCpuInfo(BaseModel):
    percent: float = Field(..., description="Overall CPU usage percent.")
    per_cpu_percent: list[float] = Field(
        default_factory=list,
        description="Per-core CPU usage percent.",
    )
    logical_cpu_count: int


class ServerMemoryInfo(BaseModel):
    total_bytes: int
    used_bytes: int
    available_bytes: int
    percent: float


class ServerSwapInfo(BaseModel):
    total_bytes: int
    used_bytes: int
    free_bytes: int
    percent: float


class ServerLoadAverage(BaseModel):
    load_1m: float
    load_5m: float
    load_15m: float


class ServerDiskInfo(BaseModel):
    mountpoint: str
    device: str
    fstype: str
    total_bytes: int
    used_bytes: int
    free_bytes: int
    percent: float


class ServerProcessInfo(BaseModel):
    pid: int
    name: str
    username: str | None = None
    cpu_percent: float
    memory_percent: float
    status: str
    create_time: datetime | None = None


class ServerHealthSnapshot(BaseModel):
    type: str = Field(default="snapshot", description="WebSocket message type.")
    collected_at: datetime
    host: ServerHostInfo
    cpu: ServerCpuInfo
    memory: ServerMemoryInfo
    swap: ServerSwapInfo
    load_average: ServerLoadAverage
    disks: list[ServerDiskInfo]
    processes: list[ServerProcessInfo] = Field(
        ...,
        description="Top processes by CPU usage.",
    )
    slow_processes: list[ServerProcessInfo] = Field(
        ...,
        description="Processes above CPU or memory thresholds.",
    )
