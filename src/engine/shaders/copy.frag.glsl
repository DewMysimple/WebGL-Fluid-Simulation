// Copyright (c) 2017 Pavel Dobryakov. MIT License; see LICENSE.
precision mediump float;
precision mediump sampler2D;

varying highp vec2 vUv;
uniform sampler2D uTexture;

void main () {
    gl_FragColor = texture2D(uTexture, vUv);
}
