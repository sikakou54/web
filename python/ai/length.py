import numpy as np

A = np.array([[1,2],[3,4]])
B = np.array([[5,6],[7,8]])

#print(np.dot(A,B))

A = np.array([[1,2,3],[4,5,6]])
B = np.array([[1,2,7],[3,4,8],[5,6,9]])

#C = np.array([[1,2],[3,4]])

#print(f'A.shape:{A.shape}, A.ndim:{np.ndim(A)}')
#print(f'B.shape:{B.shape}, B.ndim:{np.ndim(B)}')
#print(np.dot(A,B))

#for sp in A.shape:
#    print(f'sp:{sp}')

#print(np.dot(A,C))

X = np.array([1,2])
W = np.array([[1,3,5],[2,4,6]])

#print(np.dot( X, W))

X = np.array([1,5])
W1 = np.array([[1,3,5],[2,4,6]])
B1 = np.array([1,2,3])

A1 = np.dot( X, W1) + B1
#print(A1)


#-------------------------------------------

# シグモイド関数
def sigmoid( x ):
    return 1 / ( 1 + np.exp(-x) )

# 恒等関数
def identity_function( x ):
    return x

X = np.array([1,0.5])
W1 = np.array([[0.1,0.3,0.5],[0.2,0.4,0.6]])
B1 = np.array([0.1,0.2,0.3])

#print(W1.shape)
#print(X.shape)
#print(B1.shape)

A1 = np.dot( X, W1 ) + B1
Z1 = sigmoid(A1)

#print(A1)
print(f'Z1:{Z1}')

W2 = np.array([[0.1,0.4],[0.2,0.5],[0.3,0.6]])
B2 = np.array([0.1,0.2])

A2 = np.dot( Z1, W2 ) + B2
Z2 = sigmoid(A2)

print(f'Z2:{Z2}')

W3 = np.array([[0.1,0.3],[0.2,0.4]])
B3 = np.array([0.1,0.2])

A3 = np.dot( Z2, W3 ) + B3
Y = identity_function( A3 )

print(f'Y:{Y}')