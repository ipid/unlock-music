<template>
    <el-table :data="tableData" style="width: 100%">

        <el-table-column label="封面">
            <template slot-scope="scope">
                <el-image :src="scope.row.picture" style="width: 100px; height: 100px">
                    <div slot="error" class="image-slot el-image__error">
                        暂无封面
                    </div>
                </el-image>
            </template>
        </el-table-column>
        <el-table-column label="歌曲">
            <template slot-scope="scope">
                <span>{{ scope.row.title }}</span>
            </template>
        </el-table-column>
        <el-table-column label="歌手">
            <template slot-scope="scope">
                <p>{{ scope.row.artist }}</p>
            </template>
        </el-table-column>
        <el-table-column label="专辑">
            <template slot-scope="scope">
                <p>{{ scope.row.album }}</p>
            </template>
        </el-table-column>
        <el-table-column label="操作">
            <template slot-scope="scope">
                <el-button circle
                           icon="el-icon-video-play" type="success" @click="handlePlay(scope.$index, scope.row)">
                </el-button>
                <el-button circle
                           icon="el-icon-download" @click="handleDownload(scope.row)">
                </el-button>
                <el-button circle
                           icon="el-icon-delete" type="danger" @click="handleDelete(scope.$index, scope.row)">
                </el-button>
            </template>
        </el-table-column>
    </el-table>
</template>

<script>
import {DownloadBlobMusic, RemoveBlobMusic} from '@/component/utils'

export default {
    name: "PreviewTable",
    props: {
        tableData: {type: Array, required: true},
        filename_format: {type: String, required: true}
    },

    methods: {
        handlePlay(index, row) {
            this.$emit("music_changed", row.file);
        },
        handleDelete(index, row) {
            RemoveBlobMusic(row);
            this.tableData.splice(index, 1);
        },
        handleDownload(row) {
            DownloadBlobMusic(row, this.download_format)
        },
    }
}
</script>

<style scoped>

</style>
