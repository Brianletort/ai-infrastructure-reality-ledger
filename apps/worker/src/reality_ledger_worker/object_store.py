import hashlib
import os
import shutil
from dataclasses import dataclass
from pathlib import Path

from reality_ledger_worker.source_adapter import Redistribution


class RedistributionDenied(ValueError):
    """Raised when snapshot storage or disclosure violates source policy."""


@dataclass(frozen=True)
class StoredObject:
    sha256: str
    path: Path
    byte_length: int
    redistribution: Redistribution


class ContentAddressedObjectStore:
    def __init__(self, root: Path) -> None:
        self._root = root

    def put(self, content: bytes, redistribution: Redistribution) -> StoredObject:
        if redistribution in {Redistribution.LINK_ONLY, Redistribution.PROHIBITED}:
            raise RedistributionDenied(
                f"{redistribution.value} content cannot be retained as a snapshot"
            )

        sha256 = hashlib.sha256(content).hexdigest()
        path = self._root / "sha256" / sha256[:2] / sha256
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            if hashlib.sha256(path.read_bytes()).hexdigest() != sha256:
                raise OSError("content-addressed object failed integrity verification")
        else:
            temporary = path.with_suffix(f".tmp-{os.getpid()}")
            try:
                temporary.write_bytes(content)
                temporary.chmod(0o444)
                temporary.replace(path)
            finally:
                temporary.unlink(missing_ok=True)

        return StoredObject(
            sha256=sha256,
            path=path,
            byte_length=len(content),
            redistribution=redistribution,
        )

    def read_for_publication(self, stored: StoredObject) -> bytes:
        self._require_republish(stored)
        return stored.path.read_bytes()

    def export(self, stored: StoredObject, destination: Path) -> Path:
        self._require_republish(stored)
        destination.mkdir(parents=True, exist_ok=True)
        exported = destination / stored.sha256
        shutil.copyfile(stored.path, exported)
        return exported

    @staticmethod
    def _require_republish(stored: StoredObject) -> None:
        if stored.redistribution is not Redistribution.REPUBLISH:
            raise RedistributionDenied(
                f"{stored.redistribution.value} content cannot be published or exported"
            )
