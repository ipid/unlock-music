<template>
  <div>
    <file-selector @error="showFail" @success="showSuccess" />

    <div id="app-control">
      <el-row class="mb-3">
        <span>歌曲命名格式：</span>
        <el-radio v-for="k in FilenamePolicies" :key="k.key" v-model="filename_policy" :label="k.key">
          {{ k.text }}
        </el-radio>
      </el-row>
      <el-row>
        <edit-dialog
          :show="showEditDialog"
          :picture="editing_data.picture"
          :title="editing_data.title"
          :artist="editing_data.artist"
          :album="editing_data.album"
          :albumartist="editing_data.albumartist"
          :genre="editing_data.genre"
          @cancel="showEditDialog = false" @ok="handleEdit"></edit-dialog>
        <config-dialog :show="showConfigDialog" @done="showConfigDialog = false"></config-dialog>
        <el-tooltip class="item" effect="dark" placement="top">
          <div slot="content">
            <span> 部分解密方案需要设定解密参数。 </span>
          </div>
          <el-button icon="el-icon-s-tools" plain @click="showConfigDialog = true">解密设定</el-button>
        </el-tooltip>
        <el-button icon="el-icon-download" plain @click="handleDownloadAll">下载全部</el-button>
        <el-button icon="el-icon-delete" plain type="danger" @click="handleDeleteAll">清除全部</el-button>

        <el-tooltip class="item" effect="dark" placement="top-start">
          <div slot="content">
            <span v-if="instant_save">工作模式: {{ dir ? '写入本地文件系统' : '调用浏览器下载' }}</span>
            <span v-else>
              当您使用此工具进行大量文件解锁的时候，建议开启此选项。<br />
              开启后，解锁结果将不会存留于浏览器中，防止内存不足。
            </span>
          </div>
            <el-checkbox v-model="instant_save" type="success" border class="ml-2">立即保存</el-checkbox>
        </el-tooltip>
      </el-row>
    </div>

    <audio :autoplay="playing_auto" :src="playing_url" controls />

    <PreviewTable :policy="filename_policy" :table-data="tableData" @download="saveFile" @edit="editFile" @play="changePlaying" />
  </div>
</template>

<script>
import FileSelector from '@/component/FileSelector';
import PreviewTable from '@/component/PreviewTable';
import ConfigDialog from '@/component/ConfigDialog';
import EditDialog from '@/component/EditDialog';

import { DownloadBlobMusic, FilenamePolicy, FilenamePolicies, RemoveBlobMusic, DirectlyWriteFile } from '@/utils/utils';
import { GetImageFromURL, RewriteMetaToMp3, RewriteMetaToFlac, AudioMimeType, split_regex } from '@/decrypt/utils';
import { parseBlob as metaParseBlob } from 'music-metadata-browser';

export default {
  name: 'Home',
  components: {
    FileSelector,
    PreviewTable,
    ConfigDialog,
    EditDialog,
  },
  data() {
    return {
      showConfigDialog: false,
      showEditDialog: false,
      editing_data: { picture: '', title: '', artist: '', album: '', albumartist: '', genre: '', },
      tableData: [],
      playing_url: '',
      playing_auto: false,
      filename_policy: FilenamePolicy.ArtistAndTitle,
      instant_save: false,
      FilenamePolicies,
      dir: null,
    };
  },
  watch: {
    instant_save(val) {
      if (val) this.showDirectlySave();
    },
  },
  methods: {
    async showSuccess(data) {
      if (this.instant_save) {
        await this.saveFile(data);
        RemoveBlobMusic(data);
      } else {
        this.tableData.push(data);
        this.$notify.success({
          title: '解锁成功',
          message: '成功解锁 ' + data.title,
          duration: 3000,
        });
      }
      if (process.env.NODE_ENV === 'production') {
        let _rp_data = [data.title, data.artist, data.album];
        window._paq.push(['trackEvent', 'Unlock', data.rawExt + ',' + data.mime, JSON.stringify(_rp_data)]);
      }
    },
    showFail(errInfo, filename) {
      console.error(errInfo, filename);
      this.$notify.error({
        title: '出现问题',
        message:
          errInfo +
          '，' +
          filename +
          '，参考<a target="_blank" href="https://github.com/ix64/unlock-music/wiki/使用提示">使用提示</a>',
        dangerouslyUseHTMLString: true,
        duration: 6000,
      });
      if (process.env.NODE_ENV === 'production') {
        window._paq.push(['trackEvent', 'Error', String(errInfo), filename]);
      }
    },
    changePlaying(url) {
      this.playing_url = url;
      this.playing_auto = true;
    },
    handleDeleteAll() {
      this.tableData.forEach((value) => {
        RemoveBlobMusic(value);
      });
      this.tableData = [];
    },
    handleDecryptionConfig() {
      this.showConfigDialog = true;
    },
    handleDownloadAll() {
      let index = 0;
      let c = setInterval(() => {
        if (index < this.tableData.length) {
          this.saveFile(this.tableData[index]);
          index++;
        } else {
          clearInterval(c);
        }
      }, 300);
    },
    async handleEdit(data) {
      this.showEditDialog = false;
      URL.revokeObjectURL(this.editing_data.file);
      if (data.picture) {
        URL.revokeObjectURL(this.editing_data.picture);
        this.editing_data.picture = URL.createObjectURL(data.picture);
      }
      this.editing_data.title = data.title;
      this.editing_data.artist = data.artist;
      this.editing_data.album = data.album;
      try {
        const musicMeta = await metaParseBlob(new Blob([this.editing_data.blob], { type: mime }));
        const imageInfo = await GetImageFromURL(this.editing_data.picture);
        if (!imageInfo) {
          console.warn('获取图像失败', this.editing_data.picture);
        }
        const newMeta = { picture: imageInfo?.buffer,
          title: data.title,
          artists: data.artist.split(split_regex),
          album: data.album,
          albumartist: data.albumartist,
          genre: data.genre.split(split_regex)
        };
        const buffer = Buffer.from(await this.editing_data.blob.arrayBuffer());
        const mime = AudioMimeType[this.editing_data.ext] || AudioMimeType.mp3;
        if (this.editing_data.ext === 'mp3') {
          this.editing_data.blob = new Blob([RewriteMetaToMp3(buffer, newMeta, musicMeta)], { type: mime });
        } else if (this.editing_data.ext === 'flac') {
          this.editing_data.blob = new Blob([RewriteMetaToFlac(buffer, newMeta, musicMeta)], { type: mime });
        } else {
          console.info('writing metadata for ' + info.ext + ' is not being supported for now');
        }
      } catch (e) {
        console.warn('Error while appending cover image to file ' + e);
      }
      this.editing_data.file = URL.createObjectURL(this.editing_data.blob);/**/
      this.$notify.success({
        title: '修改成功',
        message: '成功修改 ' + this.editing_data.title,
        duration: 3000,
      });
    },

    async editFile(data) {
      this.editing_data = data;
      const musicMeta = await metaParseBlob(this.editing_data.blob);
      this.editing_data.albumartist = musicMeta.common.albumartist || '';
      this.editing_data.genre = musicMeta.common.genre?.toString() || '';
      this.showEditDialog = true;
    },
    async saveFile(data) {
      if (this.dir) {
        await DirectlyWriteFile(data, this.filename_policy, this.dir);
        this.$notify({
          title: '保存成功',
          message: data.title,
          position: 'top-left',
          type: 'success',
          duration: 3000,
        });
      } else {
        DownloadBlobMusic(data, this.filename_policy);
      }
    },
    async showDirectlySave() {
      if (!window.showDirectoryPicker) return;
      try {
        await this.$confirm('您的浏览器支持文件直接保存到磁盘，是否使用？', '新特性提示', {
          confirmButtonText: '使用',
          cancelButtonText: '不使用',
          type: 'warning',
          center: true,
        });
      } catch (e) {
        console.log(e);
        return;
      }
      try {
        this.dir = await window.showDirectoryPicker();
        const test_filename = '__unlock_music_write_test.txt';
        await this.dir.getFileHandle(test_filename, { create: true });
        await this.dir.removeEntry(test_filename);
      } catch (e) {
        console.error(e);
      }
    },
  },
};
</script>
