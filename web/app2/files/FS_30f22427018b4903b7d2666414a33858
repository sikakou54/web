import numpy as np

def softmax( a ):
    max = np.max( a )
    exp_a = np.exp( a - max )
    sum_exp_a = np.sum( exp_a )
    return exp_a / sum_exp_a

a = np.array( [0.3, 2.9, 4.0 ])
#print( softmax( a ) )

a = np.array( [ 1010, 1000, 990 ])
print(np.sum(softmax( a )))