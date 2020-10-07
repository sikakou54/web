#!/usr/local/bin/python3
# coding: utf-8

from flask import Flask, redirect, url_for, session
from flask import render_template, request

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == "__main__":
    app.run()
