from tinydb import TinyDB, where
import uuid, time, os

BASE_DIR = os.path.dirname(__file__)
FILES_DIR = BASE_DIR + '/files'
DATA_FILE = BASE_DIR + '/data/data.json'


def save_file( upfile, meta ):
    id = 'FS_' + uuid.uuid4().hex
    upfile.save(FILES_DIR + '/' + id )

    db = TinyDB( DATA_FILE )
    meta['id'] = id
    term = meta['limit'] * 60 * 60 * 24
    meta['time_limit'] = time.time() + term
    db.insert( meta )
    return id

def get_data( id ):
    db = TinyDB( DATA_FILE )
    f = db.get( where('id') == id )
    if not f is None:
        f['path'] = FILES_DIR + '/' + id
    return f

def set_data( id, meta ):
    db = TinyDB( DATA_FILE )
    db = db.update( meta, where('id') == id )

def get_all():
    db = TinyDB( DATA_FILE )
    return db.all()

def remove_data( id ):
    path = FILES_DIR + '/' + id
    os.remove(path)
    db = TinyDB( DATA_FILE )
    db.remove(where('id') == id )


