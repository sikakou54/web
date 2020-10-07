from flask import Flask, redirect, request
from flask import render_template, send_file
import os, json, time
import fs_data

app = Flask(__name__)
MASTER_PW = 'asdf'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    upfile = request.files.get('upfile', None )
    if upfile is None:
        return msg('アップロード失敗')
    if upfile.filename == '':
        return msg('アップロード失敗')
    
    meta = {
        'name':request.form.get('name', '名無し'),
        'memo':request.form.get('memo', 'なし'),
        'pw':request.form.get('pw', 'なし'),
        'limit': int( request.form.get('limit', 'なし') ),
        'count': int( request.form.get('count', 'なし') ),
        'filename':upfile.filename
    }

    if meta['limit'] == 0 or ( meta['pw'] == '' ):
        return msg('パラメータが不正です')
    fs_data.save_file( upfile, meta )
    return render_template('info.html',
                            meta=meta,
                            mode='upload',
                            url=request.host_url + 'download/' + meta['id'])

@app.route('/download/<id>')
def download( id ):
    meta = fs_data.get_data( id )
    if meta is None:
        return msg('パラメータが不正です')
    return render_template('info.html',
                            meta=meta,
                            url=request.host_url + 'download_go/' + id )

@app.route('/download_go/<id>', methods=['POST'])
def download_go( id ):
    meta = fs_data.get_data( id )
    if meta is None:
        return msg('パラメータが不正です')
    pw = request.form.get( 'pw', '' )
    if pw != meta['pw']:
        return msg('パスワードが違います')
    meta['count'] = meta['count'] - 1
    if meta['count'] < 0:
        return msg('ダウンロード回数を超えました')
    fs_data.set_data( id, meta )
    if meta['time_limit'] < time.time():
        return msg('ダウンロードの期限が過ぎています')
    return send_file( meta['path'],
                      as_attachment=True,
                      attachment_filename=meta['filename'] )

@app.route('/admin/list')
def admin_list():
    if request.args.get( 'pw', '' ) != MASTER_PW:
        return msg('マスターパスワードが違います')
    return render_template( 'admin_list.html',
                            files=fs_data.get_all(),
                            pw=MASTER_PW )

@app.route('/admin/remove/<id>')
def admin_remove( id ):
    if request.args.get( 'pw', '') != MASTER_PW:
        return msg('マスターパスワードが違います')
    fs_data.remove_data( id )
    return msg('削除しました')

def msg( s ):
    return render_template( 'error.html', message=s )

def filter_datetime( tm ):
    return time.strftime( '%Y%m%d %H:%M:%S',
                           time.localtime( tm ) )

app.jinja_env.filters['datetime'] = filter_datetime

if __name__ == '__main__':
    app.run()