#!/usr/local/bin/python3
# coding: utf-8

from flask import Flask, redirect, url_for, session
from flask import render_template, request
import os, json, datetime
import bbs_login    #ログイン管理モジュール
import bbs_data     #データ入出力用モジュール

app = Flask(__name__)
app.secret_key = 'asdf'

@app.route('/')
def index():
    if not bbs_login.is_login():
        print('please login')
        return redirect('/login')

    print('already login')
    return render_template('index.html',
                            user=bbs_login.get_user(),
                            data=bbs_data.load_data())

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/try_login', methods=['POST'])
def try_login():
    user = request.form.get('user','')
    pw = request.form.get('pw','')
    if bbs_login.try_login( user, pw ):
        print('login success')
        return redirect('/')
    return show_msg('ログインに失敗しました')

@app.route('/logout')
def logout():
    bbs_login.try_logout()
    return show_msg('ログアウトしました')

@app.route('/write', methods=['POST'])
def write():
    if not bbs_login.is_login():
        return redirect('/login')
    ta = request.form.get('ta','')
    if ta == '':
        return show_msg('書き込みが空でした')
    bbs_data.save_data_append(user=bbs_login.get_user(),
                              text=ta)
    return redirect('/')

def show_msg( msg ):
    return render_template('msg.html', msg=msg )

if __name__ == "__main__":
    app.run()
