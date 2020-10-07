# win32com ライブラリを読み込み
import win32com.client

# Excelを起動する
app = win32com.client.Dispatch("Excel.Application")
app.Visible = True

# Excelに新規ワークブックを追加
book = app.Workbooks.Add()

# アクティブなシートを得る
sheet = book.ActiveSheet

ROW_LIST = [1,2,3,4,5,6,7,8,9]
COL_LIST = [1,2,3,4,5,6,7,8,9]

for row in ROW_LIST:
    for col in COL_LIST:
        sheet.Cells(row,col).value = row*col
