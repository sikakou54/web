#!/usr/local/bin/python3
# coding: utf-8
import os, json, datetime

#保存先ファイル
BASE_DIR = os.path.dirname(__file__)
SAVE_FILE = BASE_DIR + '/data/log.json'

#ログ(JSON)ファイルを読み出す
def load_data():
    print(SAVE_FILE)
    if not os.path.exists(SAVE_FILE):
        print('none file')
        return
    print('find file')
    with open( SAVE_FILE, 'rt', encoding='utf-8') as f:
        print('open file')
        return json.load( f )

#ログ(JSON)ファイルに書き込む
def save_data( data_list ):
    with open(SAVE_FILE, 'wt', encoding='utf-8') as f:
        json.dump( data_list, f )

#ログ(JSON)ファイルに追記保存
def save_data_append( user, text ):
    tm = get_datatime_now()
    data = { 'name':user, 'text':text, 'date':tm }
    data_list = load_data()
    data_list.insert( 0, data )
    save_data( data_list )

#日時を文字列で得る
def get_datatime_now():
    now = datetime.datetime.now()
    return "{0:%Y%m%d %H%M}".format( now )