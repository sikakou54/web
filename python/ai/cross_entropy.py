import numpy as np

def cross_entropy( y, t ):
    delta = 1e-7
    return -np.sum( t * np.log( y + delta ) )

t = np.array( [ 0, 0, 1, 0, 0, 0, 0, 0, 0, 0 ] )
y = np.array( [ 0.1, 0.05, 0.8, 0.0, 0.05, 0.1, 0.0, 0.1, 0.0, 0.0 ] )

print(np.e)
print( cross_entropy( y, t ) )
print( np.log( 0.6+1e-7) )
print( 0.6 + 1e-7)