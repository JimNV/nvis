import cv2
import numpy as np
import sys
import os


def get_blur_degree(image_file, sv_num=10):
    img = cv2.imread(image_file,cv2.IMREAD_GRAYSCALE)
    u, s, v = np.linalg.svd(img)
    top_sv = np.sum(s[0:sv_num])
    total_sv = np.sum(s)
    return top_sv/total_sv


def get_blur_map(image_file, win_size=10, sv_num=3):
    img = cv2.imread(image_file, cv2.IMREAD_GRAYSCALE)
    #if len(img.shape) == 2:
    #    sys.stdout.write("shape: " + str(img.shape[0]))

    new_img = np.zeros((img.shape[0] + win_size * 2, img.shape[1] + win_size * 2))
    for i in range(new_img.shape[0]):
        for j in range(new_img.shape[1]):
            if i<win_size:
                p = win_size-i
            elif i>img.shape[0]+win_size-1:
                p = img.shape[0]*2-i
            else:
                p = i-win_size
            if j<win_size:
                q = win_size-j
            elif j>img.shape[1]+win_size-1:
                q = img.shape[1]*2-j
            else:
                q = j-win_size
            #print p,q, i, j
            new_img[i,j] = img[p,q]

    blur_map = np.zeros((img.shape[0], img.shape[1]))
    max_sv = 0
    min_sv = 1
    for i in range(img.shape[0]):
        for j in range(img.shape[1]):
            #block = new_img[i:i + win_size * 2, j:j + win_size * 2]
            block = new_img[i:i + win_size, j:j + win_size]
            u, s, v = np.linalg.svd(block)
            top_sv = np.sum(s[0:sv_num])
            total_sv = np.sum(s)
            sv_degree = top_sv / total_sv
            if max_sv < sv_degree:
                max_sv = sv_degree
            if min_sv > sv_degree:
                min_sv = sv_degree
            blur_map[i, j] = sv_degree

    blur_map = (blur_map - min_sv) / (max_sv - min_sv)
    
    return blur_map

fileName0 = sys.argv[1]
fileName1 = sys.argv[2]
winSize = int(sys.argv[3])
strideSize = int(winSize / 2 - 1)
#strideSize = int(sys.argv[4])

baseImage = cv2.imread(fileName0)

blurMap0 = get_blur_map(fileName0, winSize, strideSize)
blurMap1 = get_blur_map(fileName1, winSize, strideSize)

tolerance = 0.0
multiplier = 1.0

diffMap = (blurMap0 - blurMap1) * multiplier 

selectMaskHigher = diffMap > tolerance
selectMaskLower = diffMap < -tolerance
#baseImage[selectMaskHigher] = [baseImage[:, :, 0], diffMap[:, :], baseImage[:, :, 1]]
#baseImage[selectMaskLower,0] = [-diffMap[:, :], baseImage[:, :, 1], baseImage[:, :, 2]]

for y in range(baseImage.shape[0]):
    for x in range(baseImage.shape[1]):
        value = diffMap[y, x] * 255;
        if selectMaskHigher[y, x]:
            baseImage[y, x, 2] += value
        elif selectMaskLower[y, x]:
            baseImage[y, x, 1] += -value

baseImage = np.clip(baseImage, 0, 255)

cv2.imwrite("blur-a-" + str(winSize) + ".png", (1 - blurMap0) * 255)
cv2.imwrite("blur-b-" + str(winSize) + ".png", (1 - blurMap1) * 255)
cv2.imwrite("output-" + str(winSize) + ".png", baseImage)
