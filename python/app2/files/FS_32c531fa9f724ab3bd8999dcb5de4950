import numpy as np
import matplotlib.pylab as plt

#ステップ関数
def step_function(x):
    return np.array( x > 0, dtype=np.int)

#シグモイド関数
def sigmoid(x):
    return 1 / ( 1 + np.exp(-x))

#ReLU関数
def relu(x):
    return np.maximum( 0, x )

#増加量
x = np.arange( -5, 5, 0.1)

#ステップ関数を実行
y = step_function(x)
plt.plot( x, y )

#シグモイド関数実行
y = sigmoid(x)
plt.plot( x, y )

#ReLU関数実行
y = relu(x)
plt.plot( x, y )

#グラフ表示
plt.ylim( -0.1, 1.1 )
plt.show()
