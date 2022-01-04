function U = chol_sec(A)
 
% Author: Stephen Conover
% Date: January 2014
% This function uses a block formulation to non-recursively computer the
% cholesky decomposition of a NxN hermitian matrix A.
 
% check for Empty:
if(isempty(A))
U = [];
return;
end;
 
% Intialize output:
N = length(A);
U = zeros(size(A));
 
blockSize = 96;
myOffset = -blockSize;
inds = 1:blockSize;
 
% Loop through each chunk of blocksize:
for n = 1:N/blockSize
 
myOffset = (n-1)*blockSize;
 
Utl = chol_sec(A(myOffset + inds, myOffset + inds));
Utr = (Utl^-1)'*A(myOffset + inds, (n*blockSize+1):N);
 
U(inds + myOffset,inds+myOffset) = Utl;
U(myOffset + inds, (n*blockSize+1):N) = Utr;
 
Sbr = A(myOffset+1+blockSize:N, myOffset+1+blockSize:N) - Utr'*Utr;
A(myOffset+1+blockSize:N, myOffset+1+blockSize:N)  = Sbr;
 
end
 
% finish off the rest of the computation < blockSize int he bottom right:
if(mod(N, blockSize) > 0)
U(myOffset+1+blockSize:end, myOffset+1+blockSize:end) = chol_sec(A(myOffset+1+blockSize:end, myOffset+1+blockSize:end));
end
end
