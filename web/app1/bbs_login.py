#!/usr/local/bin/python3
# coding: utf-8

from flask import session, redirect

USERLIST = {
    'user1':'aaa',
    'user2':'bbb',
    'user3':'ccc',
}

def is_login():
    print('is_login')
    return 'login' in session


def try_login( user, pw ):
    if user not in USERLIST:
        return False
    if USERLIST[user] != pw:
        return False
    session['login'] = user
    return True

def try_logout():
    session.pop( 'login', None )
    return True

def get_user():
    if is_login():
        print('get_user')
        return session['login']
    return'not login'