function svdtest(fileName, windowRadius = 10, numValues = 3)

  image = double(rgb2gray(imread(fileName)));
  %svdTotal = sum(svd(image));
  width = columns(image);
  height = rows(image);
  
  minValue = 1.0;
  maxValue = 0.0;
  windowSize = 2 * windowRadius;
  newImage = zeros(height, width);

  for y = 1:(height - windowRadius)
    for x = 1:(width - windowRadius)
      if (x + windowSize > width || y + windowSize > height)
        continue;
      endif
      svdValues = svd(image(y:(y + windowSize), x:(x + windowSize)));
      svdValueTotal = sum(svdValues);
      svdValuePart = sum(svdValues(1:numValues));
      svdValue = svdValuePart / svdValueTotal;
      minValue = min(svdValue, minValue);
      maxValue = max(svdValue, maxValue);
      newImage(y + windowRadius, x + windowRadius) = svdValue;
    endfor
  endfor

  disp([ "Min: " num2str(minValue)]);
  disp([ "Max: " num2str(maxValue)]);
  newImage = 1.0 - (newImage - minValue) / (maxValue - minValue);
  
  svdFileName = ["svd-" regexprep(fileName, ".png", "") "." num2str(numValues) "." num2str(windowRadius) ".png"];
  disp(["Saving '" svdFileName "'"])
  imwrite(newImage, svdFileName, "png");

endfunction
