import hashlib
import shutil
import sqlite3
import pytest
from scripts.collector.snapshot import prepare, validate

@pytest.fixture
def baseline(tmp_path):
    p=tmp_path/'baseline.db'
    with sqlite3.connect(p) as conn:
        conn.executescript('CREATE TABLE fighters(id TEXT); CREATE TABLE events(id INTEGER); CREATE TABLE fights(id TEXT, fighter_id TEXT); INSERT INTO fighters VALUES("a"); INSERT INTO fighters VALUES("b"); INSERT INTO events VALUES(1); INSERT INTO fights VALUES("x","a"); INSERT INTO fights VALUES("x","b");')
    return p

def test_copy_verifies_exact_baseline_and_leaves_source_unchanged(baseline,tmp_path):
    original=baseline.read_bytes(); digest=hashlib.sha256(original).hexdigest()
    candidate=tmp_path/'candidate.db'
    prepare(baseline,candidate,digest)
    assert candidate.read_bytes()==original
    assert validate(baseline,candidate)['status']=='candidate-only'
    with pytest.raises(ValueError,match='must not already exist'):
        prepare(baseline,candidate,digest)
    assert baseline.read_bytes()==original

def test_bad_checksum_cannot_create_candidate(baseline,tmp_path):
    candidate=tmp_path/'candidate.db'
    with pytest.raises(ValueError,match='checksum differs'):
        prepare(baseline,candidate,'0'*64)
    assert not candidate.exists()

def test_identity_replacement_rejected_even_when_counts_match(baseline,tmp_path):
    candidate=tmp_path/'candidate.db';shutil.copyfile(baseline,candidate)
    with sqlite3.connect(candidate) as conn:
        conn.execute('UPDATE fights SET fighter_id="b"')
    with pytest.raises(ValueError,match='identities'):
        validate(baseline,candidate)

def test_additions_are_accepted(baseline,tmp_path):
    candidate=tmp_path/'candidate.db';shutil.copyfile(baseline,candidate)
    with sqlite3.connect(candidate) as conn:
        conn.execute('INSERT INTO events VALUES(2)')
    assert validate(baseline,candidate)['candidate']['counts']['events']==2


def test_unpaired_new_history_rejected(baseline,tmp_path):
    candidate=tmp_path/'candidate.db';shutil.copyfile(baseline,candidate)
    with sqlite3.connect(candidate) as conn:
        conn.execute('INSERT INTO fights VALUES("new","a")')
    with pytest.raises(ValueError,match='perspectives'):
        validate(baseline,candidate)
