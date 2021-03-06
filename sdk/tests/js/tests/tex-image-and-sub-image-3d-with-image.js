/*
** Copyright (c) 2015 The Khronos Group Inc.
**
** Permission is hereby granted, free of charge, to any person obtaining a
** copy of this software and/or associated documentation files (the
** "Materials"), to deal in the Materials without restriction, including
** without limitation the rights to use, copy, modify, merge, publish,
** distribute, sublicense, and/or sell copies of the Materials, and to
** permit persons to whom the Materials are furnished to do so, subject to
** the following conditions:
**
** The above copyright notice and this permission notice shall be included
** in all copies or substantial portions of the Materials.
**
** THE MATERIALS ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
** EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
** MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
** IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
** CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
** TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
** MATERIALS OR THE USE OR OTHER DEALINGS IN THE MATERIALS.
*/

function generateTest(internalFormat, pixelFormat, pixelType, prologue, resourcePath, defaultContextVersion) {
    var wtu = WebGLTestUtils;
    var tiu = TexImageUtils;
    var gl = null;
    var successfullyParsed = false;
    var imgCanvas;
    var redColor = [255, 0, 0];
    var greenColor = [0, 255, 0];

    function init()
    {
        description('Verify texImage3D and texSubImage3D code paths taking image elements (' + internalFormat + '/' + pixelFormat + '/' + pixelType + ')');

        // Set the default context version while still allowing the webglVersion URL query string to override it.
        wtu.setDefault3DContextVersion(defaultContextVersion);
        gl = wtu.create3DContext("example");

        if (!prologue(gl)) {
            finishTest();
            return;
        }

        switch (gl[pixelFormat]) {
        case gl.RED:
        case gl.RED_INTEGER:
          greenColor = [0, 0, 0];
          break;

        default:
          break;
        }

        gl.clearColor(0,0,0,1);
        gl.clearDepth(1);

        wtu.loadTexture(gl, resourcePath + "red-green.png", runTest);
    }

    function runOneIteration(image, flipY, topColor, bottomColor, bindingTarget, program)
    {
        debug('Testing ' + ' with flipY=' + flipY + ' bindingTarget=' +
              (bindingTarget == gl.TEXTURE_3D ? 'TEXTURE_3D' : 'TEXTURE_2D_ARRAY'));
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        // Disable any writes to the alpha channel
        gl.colorMask(1, 1, 1, 0);
        var texture = gl.createTexture();
        // Bind the texture to texture unit 0
        gl.bindTexture(bindingTarget, texture);
        // Set up texture parameters
        gl.texParameteri(bindingTarget, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(bindingTarget, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        // Set up pixel store parameters
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        wtu.failIfGLError(gl, 'gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);');
        // Upload the image into the texture
        // Initialize the texture to black first
        gl.texImage3D(bindingTarget, 0, gl[internalFormat], image.width, image.height, 1 /* depth */, 0,
                      gl[pixelFormat], gl[pixelType], null);
        gl.texSubImage3D(bindingTarget, 0, 0, 0, 0, gl[pixelFormat], gl[pixelType], image);

        // Draw the triangles
        wtu.clearAndDrawUnitQuad(gl, [0, 0, 0, 255]);
        // Check a few pixels near the top and bottom and make sure they have
        // the right color.
        debug("Checking lower left corner");
        wtu.checkCanvasRect(gl, 4, 4, 2, 2, bottomColor,
                            "shouldBe " + bottomColor);
        debug("Checking upper left corner");
        wtu.checkCanvasRect(gl, 4, gl.canvas.height - 8, 2, 2, topColor,
                            "shouldBe " + topColor);
    }

    function runTestOnImage(image) {
        var cases = [
            { flipY: true, topColor: redColor, bottomColor: greenColor },
            { flipY: false, topColor: greenColor, bottomColor: redColor },
        ];

        var program = tiu.setupTexturedQuadWith3D(gl, internalFormat);
        for (var i in cases) {
            runOneIteration(image, cases[i].flipY,
                            cases[i].topColor, cases[i].bottomColor,
                            gl.TEXTURE_3D, program);
        }
        program = tiu.setupTexturedQuadWith2DArray(gl, internalFormat);
        for (var i in cases) {
            runOneIteration(image, cases[i].flipY,
                            cases[i].topColor, cases[i].bottomColor,
                            gl.TEXTURE_2D_ARRAY, program);
        }
    }

    function runTest(image)
    {
        runTestOnImage(image);

        imgCanvas = document.createElement("canvas");
        imgCanvas.width = 2;
        imgCanvas.height = 2;
        var imgCtx = imgCanvas.getContext("2d");
        var imgData = imgCtx.createImageData(1, 2);
        for (var i = 0; i < 2; i++) {
            var stride = i * 8;
            imgData.data[stride + 0] = redColor[0];
            imgData.data[stride + 1] = redColor[1];
            imgData.data[stride + 2] = redColor[2];
            imgData.data[stride + 3] = 255;
            imgData.data[stride + 4] = greenColor[0];
            imgData.data[stride + 5] = greenColor[1];
            imgData.data[stride + 6] = greenColor[2];
            imgData.data[stride + 7] = 255;
        }
        imgCtx.putImageData(imgData, 0, 0);

        // apparently Image is different than <img>.
        var newImage =  new Image();
        newImage.onload = function() {
            runTest2(newImage);
        };
        newImage.onerror = function() {
            testFailed("Creating image from canvas failed. Image src: " + this.src);
            finishTest();
        };
        newImage.src = imgCanvas.toDataURL();
    }

    function runTest2(image) {
        runTestOnImage(image);

        wtu.makeImageFromCanvas(imgCanvas, function() {
            runTest3(this);
        });
    }

    function runTest3(image) {
        runTestOnImage(image);

        wtu.glErrorShouldBe(gl, gl.NO_ERROR, "should be no errors");
        finishTest();
    }

    return init;
}
