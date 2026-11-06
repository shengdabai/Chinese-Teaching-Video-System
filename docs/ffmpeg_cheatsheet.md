# FFmpeg 常用命令速查

## 1. 格式转换
```bash
ffmpeg -i input.mov -c:v libx264 -c:a aac output.mp4
```

## 2. 统一竖版分辨率与补边
```bash
ffmpeg -i input.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1" \
  -r 30 -c:v libx264 -pix_fmt yuv420p output.mp4
```

## 3. 截取片段
```bash
ffmpeg -ss 00:00:02 -to 00:00:08 -i input.mp4 -c copy clip.mp4
```

## 4. 重新编码并裁切片段
```bash
ffmpeg -ss 00:00:02 -to 00:00:08 -i input.mp4 -c:v libx264 -c:a aac clip.mp4
```

## 5. Concat 文本拼接
先准备 `concat.txt`：
```text
file 'shot_01.mp4'
file 'shot_02.mp4'
file 'shot_03.mp4'
```

执行：
```bash
ffmpeg -f concat -safe 0 -i concat.txt -c:v libx264 -c:a aac output.mp4
```

## 6. 烧录 ASS 字幕
```bash
ffmpeg -i input.mp4 -vf "ass=subtitles.ass" -c:v libx264 -c:a copy output.mp4
```

## 7. SRT 转 ASS
```bash
ffmpeg -i subtitles.srt subtitles.ass
```

## 8. 混合旁白与 BGM
```bash
ffmpeg -i video.mp4 -i voice.wav -i bgm.mp3 \
  -filter_complex "[1:a]volume=1.0[vo];[2:a]volume=0.3[bgm];[vo][bgm]amix=inputs=2:duration=first[aout]" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac output.mp4
```

## 9. Sidechain ducking
```bash
ffmpeg -i video.mp4 -i voice.wav -stream_loop -1 -i bgm.mp3 \
  -filter_complex "[1:a]volume=1.0,apad,asplit=2[vo_mix][vo_sidechain]; \
                   [2:a]volume=0.3[bgm]; \
                   [bgm][vo_sidechain]sidechaincompress=threshold=0.02:ratio=8:attack=200:release=1000[ducked]; \
                   [vo_mix][ducked]amix=inputs=2:duration=first[aout]" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac -shortest output.mp4
```

## 10. 添加片头片尾
准备 `final_concat.txt`：
```text
file 'intro.mp4'
file 'main.mp4'
file 'outro.mp4'
```

执行：
```bash
ffmpeg -f concat -safe 0 -i final_concat.txt -c:v libx264 -c:a aac final.mp4
```

## 11. 查看视频时长
```bash
ffprobe -v error -show_entries format=duration -of csv=p=0 input.mp4
```

## 12. 查看分辨率
```bash
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 input.mp4
```

## 13. 查看完整媒体信息
```bash
ffprobe -hide_banner input.mp4
```

## 14. 批量处理目录内视频
```bash
for f in raw_clips/*.mp4; do
  ffmpeg -i "$f" -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black" "normalized/$(basename "$f")"
done
```

## 15. 提取音频
```bash
ffmpeg -i input.mp4 -vn -c:a aac output.m4a
```

## 16. 去除原视频音频
```bash
ffmpeg -i input.mp4 -an -c:v copy mute.mp4
```

## 项目常用组合
- 预处理：缩放 + 补边 + 统一 30fps
- 粗剪：concat + 重新编码
- 字幕：SRT 转 ASS 后再烧录
- 混音：旁白优先，BGM ducking
- 最终出片：片头 + 主片 + 片尾
